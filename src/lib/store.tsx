import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteAllRecordings, deleteRecording } from "./audio/audioStore";
import { seedCaptures } from "./samples";
import type { Capture, Settings } from "./types";

const STORAGE_KEY = "three-things:v1";

interface Persisted {
  captures: Capture[];
  settings: Settings;
}

const defaultSettings: Settings = {
  name: "",
  consentReminder: true,
  keepRecordings: true,
  showSamples: true,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      return {
        captures: parsed.captures ?? [],
        settings: { ...defaultSettings, ...parsed.settings },
      };
    }
  } catch {
    /* fall through to a fresh start */
  }
  return { captures: seedCaptures(), settings: defaultSettings };
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

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const settings = { ...s.settings, ...patch };
      // Turning samples back on restores any that were removed.
      if (patch.showSamples && !s.captures.some((c) => c.origin === "sample")) {
        return { captures: [...s.captures, ...seedCaptures()], settings };
      }
      return { ...s, settings };
    });
  }, []);

  const deleteEverything = useCallback(() => {
    void deleteAllRecordings();
    setState((s) => ({ captures: [], settings: { ...s.settings, showSamples: false } }));
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
      updateSettings,
      deleteEverything,
    };
  }, [state, saveCapture, updateCapture, deleteCapture, updateSettings, deleteEverything]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
