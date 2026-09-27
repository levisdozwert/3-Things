/**
 * Asking someone who isn't with you. The asker's app puts a question on a
 * relay, shares a link through whatever they already use, and later collects
 * the reviewed answer. The relay only ever holds what it must: the question,
 * the asker's chosen name, and an answer until the asker's app has it.
 *
 * Nothing here is public. A question is reachable only through its link; its
 * answers only with the asker's key.
 */

/** What the asker puts on the relay. */
export interface NewQuestion {
  question: string;
  /** How the asker signs it: "Levis asked you for 3". */
  askerName: string;
  /** Who it's for, as the asker named them. Empty: anyone with the link. */
  forName: string;
  /** The asker keeps original recordings. The person answering still decides. */
  wantsAudio: boolean;
}

/** What someone opening the link sees. */
export interface PublicQuestion {
  id: string;
  question: string;
  askerName: string;
  forName: string;
  wantsAudio: boolean;
  /** Sent to one person and already answered. Links for anyone stay open. */
  answered: boolean;
}

/** One thing, as the person answering chose to send it. */
export interface SharedThing {
  headline: string;
  detail: string;
  /** A short phrase they actually said, if the review kept one. */
  said?: string;
}

/** Exactly what the person answering reviewed and sent. Nothing else leaves their phone. */
export interface AnswerPayload {
  /** The name they gave, when the link was for anyone. */
  name: string;
  things: SharedThing[];
  topic: string;
  place?: string;
  durationSec: number;
  /** Only when they allowed the asker to keep the recording: data URLs. */
  audio?: string[];
}

export interface ReceivedAnswer extends AnswerPayload {
  id: string;
  answeredAt: string;
}

export interface QuestionStatus {
  id: string;
  /** Sent, opened, answered. "gone" once it's been deleted. No read receipts, no times. */
  state: "sent" | "opened" | "answered" | "gone";
  /** Answers not yet collected by the asker's app. */
  answers: ReceivedAnswer[];
}

export const LIMITS = {
  question: 300,
  name: 48,
  headline: 200,
  detail: 700,
  topic: 40,
  things: 3,
  /** Roughly ten minutes of compressed voice. */
  audioChars: 8 * 1024 * 1024,
};

const text = (v: unknown, max: number, required = false) =>
  typeof v === "string" && v.length <= max && (!required || v.trim().length > 0);

export function isNewQuestion(value: unknown): value is NewQuestion {
  const v = value as NewQuestion;
  return (
    typeof v === "object" &&
    v !== null &&
    text(v.question, LIMITS.question, true) &&
    text(v.askerName, LIMITS.name) &&
    text(v.forName, LIMITS.name) &&
    typeof v.wantsAudio === "boolean"
  );
}

export function isAnswerPayload(value: unknown): value is AnswerPayload {
  const v = value as AnswerPayload;
  if (typeof v !== "object" || v === null) return false;
  if (!text(v.name, LIMITS.name) || !text(v.topic, LIMITS.topic) || (v.place !== undefined && !text(v.place, LIMITS.name))) {
    return false;
  }
  if (typeof v.durationSec !== "number" || !Number.isFinite(v.durationSec) || v.durationSec < 0) return false;
  if (!Array.isArray(v.things) || v.things.length === 0 || v.things.length > LIMITS.things) return false;
  const thingsOk = v.things.every(
    (t) =>
      typeof t === "object" &&
      t !== null &&
      text(t.headline, LIMITS.headline, true) &&
      text(t.detail, LIMITS.detail) &&
      (t.said === undefined || text(t.said, LIMITS.detail)),
  );
  if (!thingsOk) return false;
  if (v.audio === undefined) return true;
  return (
    Array.isArray(v.audio) &&
    v.audio.every((a) => typeof a === "string" && a.startsWith("data:audio/")) &&
    v.audio.reduce((n, a) => n + a.length, 0) <= LIMITS.audioChars
  );
}
