import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteAllRecordings, deleteRecording } from "./audio/audioStore";
import { seedCaptures } from "./samples";
import { isYearConversation, yearOfConversations } from "./yearOfConversations";
import type { Capture, Settings } from "./types";

const STORAGE_KEY = "three-things:v1";

export interface Persisted {
  captures: Capture[];
  settings: Settings;
  /** Sample conversations already offered, so removed ones don't come back. */
  seeded?: string[];
}

const defaultSettings: Settings = {
  name: "",
  consentReminder: true,
  keepRecordings: true,
  showSamples: true,
  fullLibrary: false,
};

/**
 * Keeps sample conversations current as the app grows: new samples are added
 * once, and untouched samples pick up improvements (a place, a better topic).
 * The user's own conversations are never changed.
 */
export function refreshSamples(state: Persisted): Persisted {
  const seeds = seedCaptures();
  const latest = new Map(seeds.map((c) => [c.id, c]));
  const offered = new Set(state.seeded ?? state.captures.filter((c) => c.origin === "sample").map((c) => c.id));

  const captures = state.captures.map((c) => {
    const seed = latest.get(c.id);
    if (c.origin !== "sample" || !seed || c.edited) return c;
    return { ...seed, recordedAt: c.recordedAt, keptClose: c.keptClose };
  });
  const added = state.settings.showSamples ? seeds.filter((c) => !offered.has(c.id)) : [];

  return { ...state, captures: [...captures, ...added], seeded: seeds.map((c) => c.id) };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      return refreshSamples({
        captures: parsed.captures ?? [],
        settings: { ...defaultSettings, ...parsed.settings },
        seeded: parsed.seeded,
      });
    }
  } catch {
    /* fall through to a fresh start */
  }
  const captures = seedCaptures();
  return { captures, settings: defaultSettings, seeded: captures.map((c) => c.id) };
}

function byNewest(a: Capture, b: Capture) {
  return b.recordedAt.localeCompare(a.recordedAt);
}

interface Store {
  /** Everything the user has kept, newest first, respecting "show samples". */
  captures: Capture[];
  settings: Settings;
  getCapture(id: string): Capture | undefined;
  saveCapture(capture: Capture): void;
  updateCapture(id: string, patch: Partial<Capture>): void;
  deleteCapture(id: string): void;
  /** Mark (or unmark) a conversation as especially meaningful. */
  toggleKeepClose(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
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

  const saveCapture = useCallback((capture: Capture) => {
    setState((s) => ({ ...s, captures: [capture, ...s.captures.filter((c) => c.id !== capture.id)] }));
  }, []);

  const updateCapture = useCallback((id: string, patch: Partial<Capture>) => {
    setState((s) => ({ ...s, captures: s.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCapture = useCallback((id: string) => {
    void deleteRecording(id);
    setState((s) => ({ ...s, captures: s.captures.filter((c) => c.id !== id) }));
  }, []);

  const toggleKeepClose = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      captures: s.captures.map((c) => (c.id === id ? { ...c, keptClose: !c.keptClose || undefined } : c)),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const settings = { ...s.settings, ...patch };
      let captures = s.captures;
      // Turning samples back on restores any that were removed.
      if (patch.showSamples && !captures.some((c) => c.origin === "sample")) {
        captures = [...captures, ...seedCaptures()];
      }
      // The year of conversations comes and goes as a whole.
      if (settings.fullLibrary && (patch.fullLibrary || patch.showSamples)) {
        const have = new Set(captures.map((c) => c.id));
        captures = [...captures, ...yearOfConversations().filter((c) => !have.has(c.id))];
      }
      if (patch.fullLibrary === false) captures = captures.filter((c) => !isYearConversation(c));
      return { ...s, captures, settings };
    });
  }, []);

  const deleteEverything = useCallback(() => {
    void deleteAllRecordings();
    setState((s) => ({ ...s, captures: [], settings: { ...s.settings, showSamples: false, fullLibrary: false } }));
  }, []);

  const value = useMemo<Store>(() => {
    const visible = state.captures
      .filter((c) => state.settings.showSamples || c.origin !== "sample")
      .sort(byNewest);
    return {
      captures: visible,
      settings: state.settings,
      getCapture: (id) => state.captures.find((c) => c.id === id),
      saveCapture,
      updateCapture,
      deleteCapture,
      toggleKeepClose,
      updateSettings,
      deleteEverything,
    };
  }, [state, saveCapture, updateCapture, deleteCapture, toggleKeepClose, updateSettings, deleteEverything]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
