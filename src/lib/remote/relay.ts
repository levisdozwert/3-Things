import type { AnswerPayload, NewQuestion, PublicQuestion, QuestionStatus } from "./contract";
import { RelayCore, type RelayData, type RelayStorage } from "./core";

export type RelayKind = "server" | "local";
export type AnswerResult = "sent" | "gone" | "closed" | "invalid";

/** Where questions wait for answers. The server when there is one; this browser otherwise. */
export interface Relay {
  kind: RelayKind;
  create(question: NewQuestion): Promise<{ id: string; ownerKey: string }>;
  view(id: string, options?: { peek?: boolean }): Promise<PublicQuestion | null>;
  answer(id: string, payload: AnswerPayload): Promise<AnswerResult>;
  status(items: { id: string; ownerKey: string }[]): Promise<QuestionStatus[]>;
  collect(id: string, ownerKey: string, answerIds: string[]): Promise<void>;
  remove(id: string, ownerKey: string): Promise<void>;
}

// ── On a server ─────────────────────────────────────────────

async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const serverRelay: Relay = {
  kind: "server",
  async create(question) {
    const { status, body } = await call<{ id: string; ownerKey: string }>("/api/remote", post(question));
    if (status !== 201) throw new Error("Couldn’t create the question");
    return body;
  },
  async view(id, { peek = false } = {}) {
    const { status, body } = await call<PublicQuestion>(`/api/remote/${encodeURIComponent(id)}${peek ? "?peek=1" : ""}`);
    return status === 200 ? body : null;
  },
  async answer(id, payload) {
    const { body } = await call<{ result?: AnswerResult }>(`/api/remote/${encodeURIComponent(id)}/answer`, post(payload));
    return body.result ?? "invalid";
  },
  async status(items) {
    if (items.length === 0) return [];
    const { status, body } = await call<QuestionStatus[]>("/api/remote/status", post({ items }));
    return status === 200 ? body : [];
  },
  async collect(id, ownerKey, answerIds) {
    await call(`/api/remote/${encodeURIComponent(id)}/collect`, post({ ownerKey, answerIds }));
  },
  async remove(id, ownerKey) {
    await call(`/api/remote/${encodeURIComponent(id)}/delete`, post({ ownerKey }));
  },
};

// ── In this browser ─────────────────────────────────────────

const LOCAL_KEY = "three-things:relay";

/**
 * Static previews have no server, so the relay lives in this browser. Asking
 * and answering then happen on one device, which is enough to try every step.
 */
function browserStorage(): RelayStorage {
  return {
    load(): RelayData {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) return JSON.parse(raw) as RelayData;
      } catch {
        /* start empty */
      }
      return { questions: {} };
    },
    save(data) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    },
  };
}

export const localCore = new RelayCore(browserStorage());

export const localRelay: Relay = {
  kind: "local",
  create: async (question) => localCore.create(question),
  view: async (id, options) => localCore.view(id, options),
  async answer(id, payload) {
    try {
      return localCore.answer(id, payload);
    } catch {
      // Browser storage is small; a long recording may not fit. The reviewed answer always does.
      return localCore.answer(id, { ...payload, audio: undefined });
    }
  },
  status: async (items) => localCore.status(items),
  collect: async (id, ownerKey, answerIds) => localCore.collect(id, ownerKey, answerIds),
  remove: async (id, ownerKey) => void localCore.remove(id, ownerKey),
};

// ── Choosing ────────────────────────────────────────────────

let available: Promise<RelayKind> | null = null;

/** The server relay when the app is served with one; this browser otherwise. */
export function detectRelay(): Promise<RelayKind> {
  available ??= (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("/api/health", { signal: controller.signal });
      clearTimeout(timer);
      const body = (await res.json()) as { relay?: boolean };
      return res.ok && body.relay ? "server" : "local";
    } catch {
      return "local";
    }
  })();
  return available;
}

export function relayFor(kind: RelayKind): Relay {
  return kind === "server" ? serverRelay : localRelay;
}

/**
 * Opens a link: this browser first (it costs nothing, and holds previews and
 * samples), then the server when there is one.
 */
export async function openQuestion(
  id: string,
  { peek = false } = {},
): Promise<{ question: PublicQuestion; relay: Relay } | null> {
  const here = await localRelay.view(id, { peek });
  if (here) return { question: here, relay: localRelay };
  if ((await detectRelay()) !== "server") return null;
  try {
    const question = await serverRelay.view(id, { peek });
    return question ? { question, relay: serverRelay } : null;
  } catch {
    return null;
  }
}

/** The link someone opens to answer. Short, and nothing in it but the question's id. */
export function answerLink(id: string): string {
  const url = new URL(window.location.href);
  const mode = import.meta.env.VITE_ROUTER;
  if (mode === "hash" || mode === "memory") {
    url.search = "";
    url.hash = `#/a/${id}`;
    return url.toString();
  }
  return `${url.origin}/a/${id}`;
}
