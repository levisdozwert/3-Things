/**
 * Reading several people's answers to one question side by side.
 *
 * This is one of the few places 3 Things lets an editor look across answers,
 * and only to notice structure: where people named the same thing, where
 * different ideas connect, where they see something differently. It never
 * writes an answer of its own, never says who is right, and never changes
 * what anyone said. Everything that crosses this boundary is checked against
 * the answers themselves before the user sees it (see `grounding.ts`).
 */

export interface AnswerForReading {
  /** Who answered, as the asker knows them. */
  person: string;
  things: { headline: string; detail: string; said?: string }[];
}

export interface PerspectivesRequest {
  question: string;
  answers: AnswerForReading[];
}

/** A connection between answers, pointing at them by position. */
export interface RawTheme {
  kind: "same" | "related" | "different";
  label: string;
  note?: string;
  members: { answer: number; thing: number; angle?: string }[];
}

export interface PerspectivesResponse {
  themes: RawTheme[];
}

export const PERSPECTIVE_LIMITS = {
  answers: 12,
  /** Themes of each kind worth reading; more than this stops being a reading and becomes a report. */
  connections: 6,
  takes: 4,
  labelWords: 6,
  noteWords: 24,
  angleWords: 16,
};
