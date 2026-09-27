import { sampleConversations, type SampleConversation, type SampleThing } from "../samples";
import type { DistillRequest, DistillResponse, DistilledThing, FollowUp } from "./contract";
import { groundResponse, type Sources } from "./grounding";

/**
 * How the app finds the three things.
 *
 * - "live": the conversation goes to /api/distill, where an editor model organizes
 *   what the speaker said (server/distill.ts). Its output is grounded against
 *   the transcript on the server and again here.
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
  return text.toLowerCase().match(/[a-z'’]+/g) ?? [];
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
  /** Which sample answered, in preview mode, so follow-ups can continue the same conversation. */
  sample?: string;
}

interface FindOptions {
  signal?: AbortSignal;
  /** Use a sample conversation even when live distilling is available (no microphone was used). */
  preview?: boolean;
}

async function post(req: DistillRequest, signal?: AbortSignal): Promise<DistillResponse> {
  const res = await fetch("/api/distill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`Distill failed with ${res.status}`);
  return (await res.json()) as DistillResponse;
}

const asThing = (t: SampleThing): DistilledThing => ({ ...t });

export async function findThreeThings(req: DistillRequest, { signal, preview }: FindOptions = {}): Promise<Distilled> {
  const mode = preview ? "preview" : await detectMode();

  if (mode === "preview") {
    const sample = closestSample(req.question);
    const response = groundResponse(
      { things: sample.things.map(asThing), extra: sample.extra, topic: sample.topic, place: sample.place, answered: true },
      { transcript: sample.transcript, question: sample.question, person: req.person },
    );
    return { mode, sample: sample.key, response };
  }

  if (tokens(req.transcript).length < 4) throw new NothingHeardError();
  const sources: Sources = { transcript: req.transcript, question: req.question, person: req.person };
  const response = groundResponse(await post(req, signal), sources);
  if (!response.answered) throw new NothingHeardError();
  return { mode, response };
}

interface FollowUpOptions extends FindOptions {
  /** The sample the first answer came from, in preview mode. */
  sample?: string;
}

/**
 * Goes back to the speaker: either for more things ("Ask for one more") or to
 * clear up one that was unclear ("Clarify"). Returns only the new things, or the
 * one clarified thing. May return nothing, and that's an honest answer.
 */
export async function followUpThings(
  req: DistillRequest & { followUp: FollowUp },
  { signal, preview, sample: sampleKey }: FollowUpOptions = {},
): Promise<DistilledThing[]> {
  const { followUp } = req;
  const mode = preview ? "preview" : await detectMode();

  if (mode === "preview") {
    const sample = sampleConversations.find((c) => c.key === sampleKey) ?? closestSample(req.question);
    const script = followUp.kind === "more" ? sample.followUps?.more : sample.followUps?.clarify;
    if (!script) return [];
    const things = "things" in script ? script.things : [script.thing];
    const sources = {
      transcript: `${sample.transcript} ${script.transcript}`,
      question: `${sample.question} ${followUp.asked}`,
      person: req.person,
    };
    const grounded = groundResponse({ things: things.map(asThing), topic: sample.topic, answered: true }, sources);
    return followUp.kind === "more" ? grounded.things.slice(0, followUp.want) : grounded.things.slice(0, 1);
  }

  if (tokens(followUp.transcript).length < 2) return [];
  const sources: Sources = {
    transcript: `${req.transcript} ${followUp.transcript}`,
    question: `${req.question} ${followUp.asked}`,
    person: req.person,
  };
  const response = groundResponse(await post(req, signal), sources);
  if (followUp.kind === "clarify") return response.things.slice(0, 1);
  // Never hand back something already captured as if it were new.
  const known = new Set(followUp.keep.map((t) => t.headline.toLowerCase()));
  return response.things.filter((t) => !known.has(t.headline.toLowerCase())).slice(0, followUp.want);
}
