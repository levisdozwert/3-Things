/**
 * The contract between the app and whatever turns a spoken answer into three things.
 *
 * The speaker is the source. The editor on the other side of this contract may
 * organize, condense and clarify what was said. It may not add to it.
 * Everything that crosses this boundary is checked against the transcript
 * before the user sees it (see `grounding.ts`).
 */

export interface DistillRequest {
  question: string;
  transcript: string;
  /** The speaker's name, if the user added one. Helps the editor, never required. */
  person?: string;
}

export interface DistilledThing {
  headline: string;
  detail: string;
  /** Verbatim words from the transcript that support this thing. */
  quote: string;
}

export interface DistillResponse {
  /** Zero to three things. Fewer than three when the speaker shared fewer. */
  things: DistilledThing[];
  topic: string;
  /** False when the recording didn't contain an answer to the question. */
  answered: boolean;
}

export const MAX_THINGS = 3;
