import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteAllRecordings, deleteRecording } from "./audio/audioStore";
import { newId } from "./format";
import {
  idsOf,
  isNew,
  merge,
  nameKey,
  pairKey,
  reconcile,
  removePerson,
  renamed,
  withoutOrphans,
  type Speaker,
} from "./people";
import type { QuestionStatus } from "./remote/contract";
import { captureIdFor, receive } from "./remote/receive";
import { localCore } from "./remote/relay";
import { sampleNotes, sampleOutgoing, samplePerspectives, seedCaptures } from "./samples";
import type { Capture, Outgoing, PersonRecord, Perspectives, Profile, Settings } from "./types";

/** The year-of-conversations preview (loaded only when someone turns it on). */
const isYearConversation = (c: Capture) => c.id.startsWith("year-");

const STORAGE_KEY = "three-things:v1";

export interface Persisted {
  captures: Capture[];
  /** Everyone the user has named. Private to this Library. */
  people: PersonRecord[];
  settings: Settings;
  /** Sample conversations already offered, so removed ones don't come back. */
  seeded?: string[];
  /** Pairs of people the user said are different people, so we don't ask again. */
  separate?: string[];
  /** Questions sent to people to answer on their own phones. */
  outgoing?: Outgoing[];
  /**
   * How answers to the same question connect, by question. A layer on top of
   * the answers: it points at people's things and never changes them.
   */
  perspectives?: Record<string, Perspectives>;
}

const defaultProfile: Profile = { firstName: "", lastName: "", preferredName: "" };

export const defaultSettings: Settings = {
  profile: defaultProfile,
  consentReminder: true,
  keepRecordings: true,
  showSamples: true,
  fullLibrary: false,
  calmMotion: false,
  largerText: false,
  notifyAnswers: true,
};

/** How the asker signs a question they send. */
export function askerName(settings: Settings): string {
  return settings.profile.preferredName.trim() || settings.profile.firstName.trim();
}

/**
 * The sample questions still waiting for answers live in this browser's
 * relay, so a preview can open and answer them like anyone would.
 */
function seedWaiting(outgoing: Outgoing[], signedAs: string) {
  try {
    for (const o of outgoing) {
      if (!o.sample || o.state === "answered") continue;
      localCore.seed({
        id: o.id,
        ownerKey: o.ownerKey,
        createdAt: o.sentAt,
        question: o.question,
        askerName: signedAs,
        forName: o.person,
        wantsAudio: o.wantsAudio,
        opened: o.state === "opened",
      });
    }
  } catch {
    /* storage unavailable: the samples just can't be answered */
  }
}

/**
 * Every conversation points at its people, and reads as their current names.
 * Answers that came back from a link belong to the question they answer
 * (answers received before questions had groups are placed now).
 */
function linked(state: Persisted): Persisted {
  const { captures, people } = reconcile(state.captures, state.people, sampleNotes);
  const answered = new Map((state.outgoing ?? []).flatMap((o) => o.answers.map((id) => [id, o.group] as const)));
  const grouped = captures.map((c) => (c.group || !answered.has(c.id) ? c : { ...c, group: answered.get(c.id) }));
  return { ...state, captures: grouped, people };
}

/**
 * Keeps sample conversations current as the app grows: new samples are added
 * once, and untouched samples pick up improvements (a place, a better topic).
 * The user's own conversations are never changed, and neither is who a sample
 * is attributed to once the user has changed it (a merge, a new name).
 */
export function refreshSamples(state: Persisted): Persisted {
  const seeds = seedCaptures();
  const latest = new Map(seeds.map((c) => [c.id, c]));
  const offered = new Set(state.seeded ?? state.captures.filter((c) => c.origin === "sample").map((c) => c.id));

  const captures = state.captures.map((c) => {
    const seed = latest.get(c.id);
    if (c.origin !== "sample" || !seed || c.edited) return c;
    return {
      ...seed,
      recordedAt: c.recordedAt,
      keptClose: c.keptClose,
      unseen: c.unseen,
      personIds: c.personIds ?? seed.personIds,
    };
  });
  const added = state.settings.showSamples ? seeds.filter((c) => !offered.has(c.id)) : [];

  // Sample questions waiting for answers, offered once like the rest.
  const waiting = sampleOutgoing();
  const outgoing = state.outgoing ?? [];
  const newWaiting = state.settings.showSamples ? waiting.filter((o) => !offered.has(o.id)) : [];

  // How the sample questions' answers connect, offered once for each.
  const readings = samplePerspectives();
  const perspectives = { ...state.perspectives };
  for (const [group, reading] of Object.entries(readings)) {
    if (!perspectives[group] && state.settings.showSamples && !offered.has(`perspectives:${group}`)) perspectives[group] = reading;
  }

  return linked({
    ...state,
    people: state.people ?? [],
    captures: [...captures, ...added],
    outgoing: [...outgoing, ...newWaiting],
    perspectives,
    seeded: [...seeds.map((c) => c.id), ...waiting.map((o) => o.id), ...Object.keys(readings).map((g) => `perspectives:${g}`)],
  });
}

/** Settings saved before profiles had parts: a single name becomes the first name. */
function migrateSettings(saved: Partial<Settings> & { name?: string } = {}): Settings {
  const { name, ...rest } = saved;
  return {
    ...defaultSettings,
    ...rest,
    profile: { ...defaultProfile, ...(name ? { firstName: name } : {}), ...rest.profile },
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted> & { settings?: Partial<Settings> & { name?: string } };
      return refreshSamples({
        captures: parsed.captures ?? [],
        people: parsed.people ?? [],
        settings: migrateSettings(parsed.settings),
        seeded: parsed.seeded,
        separate: parsed.separate,
        outgoing: parsed.outgoing,
        perspectives: parsed.perspectives,
      });
    }
  } catch {
    /* fall through to a fresh start */
  }
  const captures = seedCaptures();
  const outgoing = sampleOutgoing();
  const perspectives = samplePerspectives();
  return linked({
    captures,
    people: [],
    settings: defaultSettings,
    outgoing,
    perspectives,
    seeded: [...captures.map((c) => c.id), ...outgoing.map((o) => o.id), ...Object.keys(perspectives).map((g) => `perspectives:${g}`)],
  });
}

function byNewest(a: Capture, b: Capture) {
  return b.recordedAt.localeCompare(a.recordedAt);
}

/**
 * Turns who answered into people: existing people by id, new names as new
 * records. Choosing to create another "Jason" means they're different people.
 */
function resolve(speakers: Speaker[], state: Persisted, now = new Date()) {
  const created: PersonRecord[] = [];
  const separate = new Set(state.separate);
  const ids = speakers.map((s) => {
    if (!isNew(s)) return s.id;
    const record: PersonRecord = { id: `person-${newId()}`, name: s.name.trim(), createdAt: now.toISOString() };
    for (const other of state.people) {
      if (nameKey(other.name) === nameKey(record.name)) separate.add(pairKey(other.id, record.id));
    }
    created.push(record);
    return record.id;
  });
  return { ids: [...new Set(ids)], people: [...state.people, ...created], separate: [...separate] };
}

interface Store {
  /** Everything the user has kept, newest first, respecting "show samples". */
  captures: Capture[];
  /** The people in those conversations. */
  people: PersonRecord[];
  settings: Settings;
  /** Pairs the user said are different people. */
  separate: string[];
  getCapture(id: string): Capture | undefined;
  getPerson(id: string): PersonRecord | undefined;
  /** Saves a conversation from whoever answered, adding anyone new to the Library. */
  saveCapture(capture: Capture, speakers?: Speaker[]): Capture;
  updateCapture(id: string, patch: Partial<Capture>): void;
  /** Changes who a conversation is from: add a name later, fix it, or several people. */
  setSpeakers(captureId: string, speakers: Speaker[]): void;
  deleteCapture(id: string): void;
  /** Mark (or unmark) a conversation as especially meaningful. */
  toggleKeepClose(id: string): void;
  updatePerson(id: string, patch: Partial<Pick<PersonRecord, "name" | "note" | "photo">>): void;
  mergePeople(fromId: string, intoId: string, name?: string): void;
  keepSeparate(a: string, b: string): void;
  /** Removes a person and the conversations that were theirs alone. */
  deletePerson(id: string): void;
  /** Removes a conversation's recording. The three things stay. */
  deleteAudio(captureId: string): void;
  deleteAllAudio(): void;
  updateSettings(patch: Partial<Settings>): void;
  updateProfile(patch: Partial<Profile>): void;
  /** The account, the Library, every person and recording on this device. */
  deleteEverything(): void;
  /** Questions sent to people, newest first, respecting "show samples". */
  outgoing: Outgoing[];
  getOutgoing(id: string): Outgoing | undefined;
  addOutgoing(question: Outgoing): void;
  updateOutgoing(id: string, patch: Partial<Outgoing>): void;
  /** Forgets a sent question here. (Deleting it on the relay is the caller's job.) */
  removeOutgoing(id: string): void;
  /** What the relay says about a sent question: its state, and any answers, as conversations. */
  receiveStatus(status: QuestionStatus, withAudio?: string[]): void;
  /** Opened an answer that arrived. */
  markSeen(captureId: string): void;
  /** How the answers to each question connect, read on top of them. */
  perspectives: Record<string, Perspectives>;
  savePerspectives(group: string, reading: Perspectives): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — the session still works */
    }
  }, [state]);

  const waitingSamples = state.outgoing;
  const signedAs = askerName(state.settings);
  useEffect(() => {
    if (waitingSamples) seedWaiting(waitingSamples, signedAs);
  }, [waitingSamples, signedAs]);

  // Appearance applies to the whole document.
  const { calmMotion, largerText } = state.settings;
  useEffect(() => {
    const root = document.documentElement;
    if (calmMotion) root.dataset.motion = "calm";
    else delete root.dataset.motion;
    if (largerText) root.dataset.text = "large";
    else delete root.dataset.text;
  }, [calmMotion, largerText]);

  const saveCapture = useCallback(
    (capture: Capture, speakers: Speaker[] = []) => {
      // Resolved once, so the new people have the same ids here and in the saved state.
      const { ids, people, separate } = resolve(speakers, state);
      const created = people.filter((p) => !state.people.some((q) => q.id === p.id));
      const [saved] = renamed([{ ...capture, personIds: ids }], people);
      setState((s) => ({
        ...s,
        people: [...s.people, ...created],
        separate: [...new Set([...(s.separate ?? []), ...separate])],
        captures: [saved, ...s.captures.filter((c) => c.id !== saved.id)],
      }));
      return saved;
    },
    [state],
  );

  const updateCapture = useCallback((id: string, patch: Partial<Capture>) => {
    setState((s) => ({ ...s, captures: s.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const setSpeakers = useCallback((captureId: string, speakers: Speaker[]) => {
    setState((s) => {
      const { ids, people, separate } = resolve(speakers, s);
      const captures = renamed(
        s.captures.map((c) => (c.id === captureId ? { ...c, personIds: ids } : c)),
        people,
      );
      return { ...s, captures, people: withoutOrphans(captures, people), separate };
    });
  }, []);

  const deleteCapture = useCallback((id: string) => {
    void deleteRecording(id);
    setState((s) => {
      const captures = s.captures.filter((c) => c.id !== id);
      return { ...s, captures, people: withoutOrphans(captures, s.people) };
    });
  }, []);

  const toggleKeepClose = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      captures: s.captures.map((c) => (c.id === id ? { ...c, keptClose: !c.keptClose || undefined } : c)),
    }));
  }, []);

  const updatePerson = useCallback((id: string, patch: Partial<Pick<PersonRecord, "name" | "note" | "photo">>) => {
    setState((s) => {
      const people = s.people.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch, name: patch.name?.trim() || p.name };
        if (!next.note?.trim()) delete next.note;
        if (!next.photo) delete next.photo;
        return next;
      });
      return { ...s, people, captures: renamed(s.captures, people) };
    });
  }, []);

  const mergePeople = useCallback((fromId: string, intoId: string, name?: string) => {
    setState((s) => {
      const merged = merge(s.captures, s.people, fromId, intoId, name);
      // Questions waiting for the merged person now wait for the one person.
      const outgoing = (s.outgoing ?? []).map((o) => ({
        ...o,
        speakers: o.speakers.map((sp) => ("id" in sp && sp.id === fromId ? { id: intoId } : sp)),
      }));
      return { ...s, ...merged, outgoing, separate: (s.separate ?? []).filter((k) => k !== pairKey(fromId, intoId)) };
    });
  }, []);

  const keepSeparate = useCallback((a: string, b: string) => {
    setState((s) => ({ ...s, separate: [...new Set([...(s.separate ?? []), pairKey(a, b)])] }));
  }, []);

  const deletePerson = useCallback((id: string) => {
    setState((s) => {
      const { captures, people, removed } = removePerson(s.captures, s.people, id);
      removed.forEach((captureId) => void deleteRecording(captureId));
      return { ...s, captures, people: withoutOrphans(captures, people) };
    });
  }, []);

  const deleteAudio = useCallback((captureId: string) => {
    void deleteRecording(captureId);
    setState((s) => ({ ...s, captures: s.captures.map((c) => (c.id === captureId ? { ...c, hasAudio: false } : c)) }));
  }, []);

  const deleteAllAudio = useCallback(() => {
    void deleteAllRecordings();
    setState((s) => ({ ...s, captures: s.captures.map((c) => (c.hasAudio ? { ...c, hasAudio: false } : c)) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const settings = { ...s.settings, ...patch };
      let captures = s.captures;
      // Turning samples back on restores any that were removed.
      if (patch.showSamples && !captures.some((c) => c.origin === "sample")) {
        captures = [...captures, ...seedCaptures()];
      }
      if (patch.fullLibrary === false) captures = captures.filter((c) => !isYearConversation(c));
      if (captures === s.captures) return { ...s, settings };
      const next = linked({ ...s, captures, settings });
      return { ...next, people: withoutOrphans(next.captures, next.people) };
    });
    // The year of conversations comes and goes as a whole.
    if (patch.fullLibrary || patch.showSamples) {
      void import("./yearOfConversations").then(({ yearOfConversations }) =>
        setState((s) => {
          if (!s.settings.fullLibrary || !s.settings.showSamples) return s;
          const have = new Set(s.captures.map((c) => c.id));
          const added = yearOfConversations().filter((c) => !have.has(c.id));
          return added.length ? linked({ ...s, captures: [...s.captures, ...added] }) : s;
        }),
      );
    }
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, profile: { ...s.settings.profile, ...patch } } }));
  }, []);

  const deleteEverything = useCallback(() => {
    void deleteAllRecordings();
    setState((s) => ({
      captures: [],
      people: [],
      separate: [],
      outgoing: [],
      perspectives: {},
      seeded: s.seeded,
      settings: { ...defaultSettings, showSamples: false },
    }));
  }, []);

  const addOutgoing = useCallback((question: Outgoing) => {
    setState((s) => ({ ...s, outgoing: [question, ...(s.outgoing ?? []).filter((o) => o.id !== question.id)] }));
  }, []);

  const updateOutgoing = useCallback((id: string, patch: Partial<Outgoing>) => {
    setState((s) => ({ ...s, outgoing: (s.outgoing ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }, []);

  const removeOutgoing = useCallback((id: string) => {
    setState((s) => ({ ...s, outgoing: (s.outgoing ?? []).filter((o) => o.id !== id) }));
  }, []);

  const receiveStatus = useCallback((status: QuestionStatus, withAudio: string[] = []) => {
    setState((s) => {
      const question = (s.outgoing ?? []).find((o) => o.id === status.id);
      if (!question || status.state === "gone") return s;
      const have = new Set(s.captures.map((c) => c.id));
      const fresh = status.answers.filter((a) => !have.has(captureIdFor(a)));
      if (fresh.length === 0 && question.state === status.state) return s;
      const received = receive(question, fresh, s.people);
      const captures = received.captures.map((c) => (withAudio.includes(c.id) ? { ...c, hasAudio: true } : c));
      const outgoing = (s.outgoing ?? []).map((o) =>
        o.id === question.id
          ? { ...o, state: status.state as Outgoing["state"], speakers: received.speakers, answers: [...o.answers, ...captures.map((c) => c.id)] }
          : o,
      );
      return { ...s, captures: [...captures, ...s.captures], people: received.people, outgoing };
    });
  }, []);

  const savePerspectives = useCallback((group: string, reading: Perspectives) => {
    setState((s) => ({ ...s, perspectives: { ...s.perspectives, [group]: reading } }));
  }, []);

  const markSeen = useCallback((captureId: string) => {
    setState((s) =>
      s.captures.some((c) => c.id === captureId && c.unseen)
        ? { ...s, captures: s.captures.map((c) => (c.id === captureId ? { ...c, unseen: undefined } : c)) }
        : s,
    );
  }, []);

  const value = useMemo<Store>(() => {
    const visible = state.captures
      .filter((c) => state.settings.showSamples || c.origin !== "sample")
      .sort(byNewest);
    const present = new Set(visible.flatMap(idsOf));
    const outgoing = (state.outgoing ?? [])
      .filter((o) => state.settings.showSamples || !o.sample)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    return {
      outgoing,
      getOutgoing: (id) => state.outgoing?.find((o) => o.id === id),
      addOutgoing,
      updateOutgoing,
      removeOutgoing,
      receiveStatus,
      markSeen,
      perspectives: state.perspectives ?? {},
      savePerspectives,
      captures: visible,
      people: state.people.filter((p) => present.has(p.id)),
      settings: state.settings,
      separate: state.separate ?? [],
      getCapture: (id) => state.captures.find((c) => c.id === id),
      getPerson: (id) => state.people.find((p) => p.id === id),
      saveCapture,
      updateCapture,
      setSpeakers,
      deleteCapture,
      toggleKeepClose,
      updatePerson,
      mergePeople,
      keepSeparate,
      deletePerson,
      deleteAudio,
      deleteAllAudio,
      updateSettings,
      updateProfile,
      deleteEverything,
    };
  }, [
    state,
    saveCapture,
    updateCapture,
    setSpeakers,
    deleteCapture,
    toggleKeepClose,
    updatePerson,
    mergePeople,
    keepSeparate,
    deletePerson,
    deleteAudio,
    deleteAllAudio,
    updateSettings,
    updateProfile,
    deleteEverything,
    addOutgoing,
    updateOutgoing,
    removeOutgoing,
    receiveStatus,
    markSeen,
    savePerspectives,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
