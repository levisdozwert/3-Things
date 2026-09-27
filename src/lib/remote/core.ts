import {
  isAnswerPayload,
  isNewQuestion,
  type AnswerPayload,
  type NewQuestion,
  type PublicQuestion,
  type QuestionStatus,
} from "./contract";

/**
 * The relay's whole job, independent of where it runs: a server with a file,
 * or (for static previews) this browser's own storage. Answers are held only
 * until the asker's app collects them; after that only the fact that someone
 * answered remains.
 */

interface StoredAnswer {
  id: string;
  answeredAt: string;
  /** Dropped once the asker's app has collected it. */
  payload?: AnswerPayload;
}

interface StoredQuestion extends NewQuestion {
  id: string;
  ownerKey: string;
  createdAt: string;
  openedAt?: string;
  answers: StoredAnswer[];
}

/** A deleted question leaves only this behind, so its link can say so. */
interface Tombstone {
  id: string;
  deleted: true;
}

export interface RelayData {
  questions: Record<string, StoredQuestion | Tombstone>;
}

export interface RelayStorage {
  load(): RelayData;
  save(data: RelayData): void;
}

function randomToken(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  let binary = "";
  values.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Compares keys without leaking, through timing, how much of a guess was right. */
function sameKey(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

const isLive = (q: StoredQuestion | Tombstone | undefined): q is StoredQuestion => Boolean(q) && !("deleted" in q!);

export class RelayCore {
  constructor(
    private storage: RelayStorage,
    private now: () => Date = () => new Date(),
  ) {}

  private owned(data: RelayData, id: string, ownerKey: string): StoredQuestion | null {
    const q = data.questions[id];
    return isLive(q) && sameKey(q.ownerKey, ownerKey) ? q : null;
  }

  create(input: NewQuestion): { id: string; ownerKey: string } {
    if (!isNewQuestion(input)) throw new Error("invalid_question");
    const data = this.storage.load();
    const id = randomToken(12);
    const ownerKey = randomToken(24);
    data.questions[id] = {
      id,
      ownerKey,
      createdAt: this.now().toISOString(),
      question: input.question.trim(),
      askerName: input.askerName.trim(),
      forName: input.forName.trim(),
      wantsAudio: input.wantsAudio,
      answers: [],
    };
    this.storage.save(data);
    return { id, ownerKey };
  }

  /** What the link shows. Opening it (not the asker previewing it) marks it opened. */
  view(id: string, { peek = false } = {}): PublicQuestion | null {
    const data = this.storage.load();
    const q = data.questions[id];
    if (!isLive(q)) return null;
    if (!peek && !q.openedAt) {
      q.openedAt = this.now().toISOString();
      this.storage.save(data);
    }
    return {
      id: q.id,
      question: q.question,
      askerName: q.askerName,
      forName: q.forName,
      wantsAudio: q.wantsAudio,
      answered: Boolean(q.forName) && q.answers.length > 0,
    };
  }

  /** Only what the person reviewed and chose to send. */
  answer(id: string, payload: AnswerPayload): "sent" | "gone" | "closed" | "invalid" {
    if (!isAnswerPayload(payload)) return "invalid";
    const data = this.storage.load();
    const q = data.questions[id];
    if (!isLive(q)) return "gone";
    if (q.forName && q.answers.length > 0) return "closed";
    // Recordings travel only if the asker keeps them and this person allowed it.
    const { audio, ...answer } = payload;
    const keep = q.wantsAudio && audio?.length ? { audio } : {};
    q.answers.push({ id: randomToken(12), answeredAt: this.now().toISOString(), payload: { ...answer, ...keep } });
    this.storage.save(data);
    return "sent";
  }

  status(items: { id: string; ownerKey: string }[]): QuestionStatus[] {
    const data = this.storage.load();
    return items.flatMap(({ id, ownerKey }): QuestionStatus[] => {
      const q = data.questions[id];
      if (q && !isLive(q)) return [{ id, state: "gone", answers: [] }];
      if (!q || !sameKey(q.ownerKey, ownerKey)) return [];
      const state = q.answers.length > 0 ? "answered" : q.openedAt ? "opened" : "sent";
      const answers = q.answers.flatMap((a) => (a.payload ? [{ ...a.payload, id: a.id, answeredAt: a.answeredAt }] : []));
      return [{ id, state, answers }];
    });
  }

  /** The asker's app has these now: the relay forgets what they said. */
  collect(id: string, ownerKey: string, answerIds: string[]): void {
    const data = this.storage.load();
    const q = this.owned(data, id, ownerKey);
    if (!q) return;
    q.answers = q.answers.map((a) => (answerIds.includes(a.id) ? { id: a.id, answeredAt: a.answeredAt } : a));
    this.storage.save(data);
  }

  /** The asker deleted it. The link now says it's no longer available. */
  remove(id: string, ownerKey: string): boolean {
    const data = this.storage.load();
    if (!this.owned(data, id, ownerKey)) return false;
    data.questions[id] = { id, deleted: true };
    this.storage.save(data);
    return true;
  }

  /** Samples for previews: a question with a known id, kept as it is if it already exists. */
  seed(entry: NewQuestion & { id: string; ownerKey: string; createdAt: string; opened?: boolean }): void {
    const data = this.storage.load();
    const existing = data.questions[entry.id];
    if (existing && !isLive(existing)) return;
    data.questions[entry.id] = {
      id: entry.id,
      ownerKey: entry.ownerKey,
      createdAt: entry.createdAt,
      question: entry.question,
      askerName: entry.askerName,
      forName: entry.forName,
      wantsAudio: entry.wantsAudio,
      openedAt: existing?.openedAt ?? (entry.opened ? entry.createdAt : undefined),
      answers: existing?.answers ?? [],
    };
    this.storage.save(data);
  }
}

/** A relay that lives only in memory: tests, and a server with nowhere to write. */
export function memoryStorage(): RelayStorage {
  let data: RelayData = { questions: {} };
  return {
    load: () => data,
    save: (next) => {
      data = next;
    },
  };
}
