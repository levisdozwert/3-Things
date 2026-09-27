/** One thing a person shared, written down clearly. */
export interface Thing {
  id: string;
  /** The point itself, in a few words. */
  headline: string;
  /** The context the speaker gave. May be empty. */
  detail: string;
  /** The span of the speaker's words this thing is based on (evidence, not shown as a quote). */
  quote?: string;
  /** A short, memorable phrase the speaker actually said. Shown as a quote. Rare. */
  said?: string;
  /** The follow-up question that would clear up something the speaker left unclear. */
  unclear?: string;
}

/**
 * A saved conversation: one question, one person, up to three things.
 * The knowledge is the valuable object; the recording is only a way to verify it.
 */
export interface Capture {
  id: string;
  question: string;
  /** Who answered. Empty when the user didn't add a name. */
  person: string;
  topic: string;
  /** One to three things. Never padded to three. */
  things: Thing[];
  recordedAt: string;
  durationSec: number;
  /** True when the original recording (and any follow-ups) are stored on this device. */
  hasAudio: boolean;
  /** "sample" captures ship with the app so it never feels empty. */
  origin: "recording" | "manual" | "sample";
  /** The user changed what we wrote down. */
  edited?: boolean;
  /** Made in preview mode from a sample conversation. */
  preview?: boolean;
}

export interface Settings {
  name: string;
  consentReminder: boolean;
  keepRecordings: boolean;
  showSamples: boolean;
}

/** What the listening step hands to the rest of the flow. */
export interface Recording {
  audio: Blob | null;
  durationSec: number;
  /** What speech recognition heard. Never shown as the primary experience. */
  transcript: string;
  /** True when the microphone wasn't used (preview without a mic). */
  simulated: boolean;
}
