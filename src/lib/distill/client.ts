import { sampleConversations, type SampleConversation } from "../samples";
import type { DistillRequest, DistillResponse } from "./contract";
import { groundResponse } from "./grounding";

/**
 * How the app finds the three things.
 *
 * - "live": the transcript goes to /api/distill, where an editor model organizes
 *   what the speaker said (server/distill.ts). Its output is grounded against
 *   the transcript before it comes back.
 * - "preview": no service is connected (static hosting, no API key). The flow
 *   still works end to end using a sample conversation, and the review screen
 *   says so. A real recording is never answered with sample content in live mode.
 */
export type DistillMode = "live" | "preview";

export class NothingHeardError extends Error {
  constructor() {
    super("We couldn't make out enough of the conversation.");
    this.name = "NothingHeardError";
  }
}

let modePromise: Promise<DistillMode> | null = null;

export function detectMode(): Promise<DistillMode> {
  modePromise ??= (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("/api/health", { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return "preview";
      const body = (await res.json()) as { ready?: boolean };
      return body.ready ? "live" : "preview";
    } catch {
      return "preview";
    }
  })();
  return modePromise;
}

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

/** Picks the sample conversation closest to the question the user asked. */
export function closestSample(question: string): SampleConversation {
  const asked = new Set(tokens(question));
  let best = sampleConversations.find((c) => c.key === "learn-from-you")!;
  let bestScore = 0;
  for (const convo of sampleConversations) {
    if (convo.question.toLowerCase() === question.trim().toLowerCase()) return convo;
    const score = convo.keywords.reduce((n, k) => n + (asked.has(k) ? 1 : 0), 0);
    if (score > bestScore) {
      best = convo;
      bestScore = score;
    }
  }
  return best;
}

export interface Distilled {
  response: DistillResponse;
  mode: DistillMode;
}

interface FindOptions {
  signal?: AbortSignal;
  /** Use a sample conversation even when live distilling is available (no microphone was used). */
  preview?: boolean;
}

export async function findThreeThings(req: DistillRequest, { signal, preview }: FindOptions = {}): Promise<Distilled> {
  const mode = preview ? "preview" : await detectMode();

  if (mode === "preview") {
    const sample = closestSample(req.question);
    return {
      mode,
      response: groundResponse({ things: sample.things, topic: sample.topic, answered: true }, sample.transcript),
    };
  }

  if (tokens(req.transcript).length < 4) throw new NothingHeardError();

  const res = await fetch("/api/distill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`Distill failed with ${res.status}`);
  const response = groundResponse((await res.json()) as DistillResponse, req.transcript);
  if (!response.answered) throw new NothingHeardError();
  return { mode, response };
}
