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
import { sampleNotes, seedCaptures } from "./samples";
import type { Capture, PersonRecord, Profile, Settings } from "./types";

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
};

/** Every conversation points at its people, and reads as their current names. */
function linked(state: Persisted): Persisted {
  const { captures, people } = reconcile(state.captures, state.people, sampleNotes);
  return { ...state, captures, people };
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
    return { ...seed, recordedAt: c.recordedAt, keptClose: c.keptClose, personIds: c.personIds ?? seed.personIds };
  });
  const added = state.settings.showSamples ? seeds.filter((c) => !offered.has(c.id)) : [];

  return linked({
    ...state,
    people: state.people ?? [],
    captures: [...captures, ...added],
    seeded: seeds.map((c) => c.id),
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
      });
    }
  } catch {
    /* fall through to a fresh start */
  }
  const captures = seedCaptures();
  return linked({ captures, people: [], settings: defaultSettings, seeded: captures.map((c) => c.id) });
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
      return { ...s, ...merged, separate: (s.separate ?? []).filter((k) => k !== pairKey(fromId, intoId)) };
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
      seeded: s.seeded,
      settings: { ...defaultSettings, showSamples: false },
    }));
  }, []);

  const value = useMemo<Store>(() => {
    const visible = state.captures
      .filter((c) => state.settings.showSamples || c.origin !== "sample")
      .sort(byNewest);
    const present = new Set(visible.flatMap(idsOf));
    return {
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
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
