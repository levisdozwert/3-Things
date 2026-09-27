/**
 * The contract between the app and whatever turns a spoken answer into three things.
 *
 * Clarify the person. Never replace the person.
 *
 * The editor on the other side of this contract may organize, condense and
 * clarify what was said. It may not add to it. Everything that crosses this
 * boundary is checked against what was actually said before the user sees it
 * (see `grounding.ts`).
 */

export interface DistilledThing {
  /** One clear, memorable statement, in the speaker's framing. */
  headline: string;
  /** One to three short sentences of the useful context the speaker gave. May be empty. */
  detail: string;
  /** The span of the transcript this thing is based on, copied exactly. Never shown as a quote. */
  quote: string;
  /** A short, genuinely memorable phrase the speaker said, copied exactly. Rare. */
  said?: string;
  /**
   * When something the listener needs is genuinely unclear (a name they couldn't
   * remember, an ambiguous reference): the follow-up question the asker could say
   * to the speaker. The thing itself stays as vague as the speaker was.
   */
  unclear?: string;
}

/** Going back to the speaker after the first answer. */
export type FollowUp =
  | {
      kind: "more";
      /** What the asker asked, e.g. "Is there one more thing you'd add?" */
      asked: string;
      /** What the speaker said in reply. */
      transcript: string;
      /** Things already captured, so nothing is repeated. */
      keep: DistilledThing[];
      /** How many new things are wanted (1 or 2). */
      want: number;
    }
  | {
      kind: "clarify";
      asked: string;
      transcript: string;
      /** The thing that needed clarifying. */
      thing: DistilledThing;
    };

export interface DistillRequest {
  question: string;
  /** Everything said in the conversation so far, in order. */
  transcript: string;
  /** The speaker's name, if the user added one. */
  person?: string;
  followUp?: FollowUp;
}

export interface DistillResponse {
  /**
   * Zero to three things. Fewer than three when the speaker shared fewer.
   * For a follow-up: only the new things ("more"), or the one clarified thing ("clarify").
   */
  things: DistilledThing[];
  /** A fourth idea the speaker also clearly cared about. Never shown as a fourth thing. */
  extra?: DistilledThing;
  topic: string;
  /** The place the question or answer is about, when one was named ("Boston"). */
  place?: string;
  /** False when the recording didn't contain an answer to the question. */
  answered: boolean;
}

export const MAX_THINGS = 3;
