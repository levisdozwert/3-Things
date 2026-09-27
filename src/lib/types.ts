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
 * Someone the user has learned from, as the user knows them. A private
 * reference inside the user's own Library: never a public account, never
 * searchable by anyone else, and created only because the user named them.
 */
export interface PersonRecord {
  id: string;
  /** What the user calls them: "Jason", "Mom", "Barista at Cortaditos". */
  name: string;
  /** One small private note, for the user's memory only: "Met at NJ Tech meetup". */
  note?: string;
  /** A photo the user chose. Never taken automatically, never used to recognize anyone. */
  photo?: string;
  createdAt: string;
  /**
   * Reserved for a future where they have their own 3 Things account. Only an
   * explicit action could ever set it; nothing does today. Either way, this
   * record stays the user's own private representation of them.
   */
  account?: { id: string; linkedAt: string };
}

/**
 * A saved conversation: one question, one person, up to three things.
 * The knowledge is the valuable object; the recording is only a way to verify it.
 */
export interface Capture {
  id: string;
  question: string;
  /**
   * Who answered, as it reads: "Jason", "Jason + Sarah", or empty when the user
   * didn't add a name. Kept in step with the people records it points to.
   */
  person: string;
  /**
   * The people who answered. None when unnamed; several when more than one
   * person spoke, in which case the things belong to the conversation, not to
   * any one of them.
   */
  personIds?: string[];
  topic: string;
  /** Where it's about, when the question or answer named a place ("Boston"). Quiet metadata for now. */
  place?: string;
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
  /** Marked as especially meaningful. */
  keptClose?: boolean;
  /**
   * Answered from a link on their own phone, reviewed by them, and sent back.
   * The things are exactly the version they chose to send.
   */
  remote?: { sentAt: string; answeredAt: string };
  /** Arrived from someone and not opened yet. */
  unseen?: boolean;
  /**
   * The question this answers, when the same question went to several people:
   * each person's answer stays its own conversation, and they share a group.
   */
  group?: string;
}

/**
 * How answers to one question connect, sitting on top of them. It points at
 * people's things and never changes them: whatever the grouping, each answer
 * stays exactly as its person gave it.
 */
export interface PerspectiveTheme {
  /**
   * same: they named the same thing ("Lou Malnati's").
   * related: different ideas that clearly connect ("watching the money").
   * different: they see the same thing differently ("Navy Pier").
   */
  kind: "same" | "related" | "different";
  /** A few neutral words for what connects them. */
  label: string;
  /** How they connect, grounded in what they said. Never who is right. */
  note?: string;
  members: { captureId: string; thingId: string; angle?: string }[];
}

export interface Perspectives {
  /** The answers these were read from; when they change, they're read again. */
  basis: string;
  themes: PerspectiveTheme[];
  /** editor: read by the editor model. preview: noticed on this device. sample: ships with the app. */
  by: "editor" | "preview" | "sample";
}

/** Who answered, as the app knows them: someone in the Library, or a new name. */
export type Speaker = { id: string } | { name: string };

/**
 * A question sent to someone to answer on their own phone, whenever they can.
 * Not a message thread: a question, where it went, and whether it came back.
 */
export interface Outgoing {
  /** The question's id on the relay, which is also its link. */
  id: string;
  /** Proves to the relay that this app asked it. Never shared. */
  ownerKey: string;
  /** Where it waits: a server, or (in static previews) this browser. */
  via: "server" | "local";
  question: string;
  /** Who it was sent to. None: anyone with the link can answer. */
  speakers: Speaker[];
  /** Their name as it read when sent. */
  person: string;
  /** The same question sent to several people shares a group. Each answer stays separate. */
  group: string;
  sentAt: string;
  /** Sent, opened, answered. No read receipts, no times. */
  state: "sent" | "opened" | "answered";
  /** The last reminder the user chose to send. Never automatic. */
  remindedAt?: string;
  /** Conversations that came back from it. */
  answers: string[];
  wantsAudio: boolean;
  sample?: boolean;
}

/** Just enough to be you in the app. No birthday, job, school or handles. */
export interface Profile {
  firstName: string;
  lastName: string;
  /** What 3 Things calls you. Falls back to the first name. */
  preferredName: string;
  photo?: string;
}

export interface Settings {
  profile: Profile;
  consentReminder: boolean;
  keepRecordings: boolean;
  showSamples: boolean;
  /** A year of sample conversations, to see how a full Library feels. */
  fullLibrary: boolean;
  /** Fewer animations between screens, on top of the device's own setting. */
  calmMotion: boolean;
  largerText: boolean;
  /** A quiet note when someone sends their 3 back. Nothing else ever notifies. */
  notifyAnswers: boolean;
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
