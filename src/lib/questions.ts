import { listOf } from "./format";
import { sentTo } from "./remote/describe";
import type { Capture, Outgoing, PersonRecord } from "./types";

/**
 * A question as something worth keeping in its own right: everyone it was
 * asked, and every answer, each still its own conversation from its own
 * person. Nothing here merges answers or orders people by anything but time.
 */

/** Which question a conversation answers. One asked on its own is its own question. */
export const groupOf = (capture: Capture): string => capture.group ?? capture.id;

/** Someone this question went to, and how it went. */
export interface Asked {
  key: string;
  /** Their name as it reads now. Empty for a link anyone can answer that nobody has answered yet. */
  name: string;
  personIds: string[];
  how: "in person" | "link";
  state: "answered" | "opened" | "sent";
  /** When they were asked: sent, or the conversation itself. */
  at: string;
  outgoing?: Outgoing;
  /** What came back from them. Usually one conversation. */
  answers: Capture[];
}

export interface QuestionCollection {
  key: string;
  question: string;
  /** In the order they arrived. Never by length, speed or anything else. */
  answers: Capture[];
  /** In the order they were asked. */
  asked: Asked[];
  /** How many people it went to (a link anyone can answer counts those who did). */
  people: number;
  topic: string;
  place?: string;
  firstAsked: string;
  /** The latest answer, or when it was last sent. */
  latest: string;
  things: number;
  /** Something arrived that hasn't been opened. */
  unseen: boolean;
}

const oldestFirst = (a: string, b: string) => a.localeCompare(b);

function collect(key: string, captures: Capture[], outgoing: Outgoing[], people: PersonRecord[]): QuestionCollection {
  const answers = [...captures].sort((a, b) => oldestFirst(a.recordedAt, b.recordedAt));
  const byId = new Map(answers.map((c) => [c.id, c]));
  const fromLinks = new Set(outgoing.flatMap((o) => o.answers));
  const asked: Asked[] = [];

  for (const o of [...outgoing].sort((a, b) => oldestFirst(a.sentAt, b.sentAt))) {
    const back = o.answers.flatMap((id) => byId.get(id) ?? []);
    if (o.speakers.length > 0) {
      asked.push({
        key: o.id,
        name: sentTo(o, people),
        personIds: back[0]?.personIds ?? o.speakers.flatMap((s) => ("id" in s ? [s.id] : [])),
        how: "link",
        state: back.length > 0 ? "answered" : o.state,
        at: o.sentAt,
        outgoing: o,
        answers: back,
      });
      continue;
    }
    // A link anyone can answer: each person who did is someone you heard from.
    for (const c of back) {
      asked.push({ key: c.id, name: c.person, personIds: c.personIds ?? [], how: "link", state: "answered", at: o.sentAt, outgoing: o, answers: [c] });
    }
    if (back.length === 0) {
      asked.push({ key: o.id, name: "", personIds: [], how: "link", state: o.state, at: o.sentAt, outgoing: o, answers: [] });
    }
  }
  for (const c of answers) {
    if (fromLinks.has(c.id)) continue;
    asked.push({ key: c.id, name: c.person, personIds: c.personIds ?? [], how: "in person", state: "answered", at: c.recordedAt, answers: [c] });
  }
  asked.sort((a, b) => oldestFirst(a.at, b.at));

  const first = [...answers.map((c) => ({ at: c.recordedAt, q: c.question })), ...outgoing.map((o) => ({ at: o.sentAt, q: o.question }))].sort(
    (a, b) => oldestFirst(a.at, b.at),
  )[0];
  const latest = [...answers.map((c) => c.recordedAt), ...outgoing.map((o) => o.sentAt)].sort().at(-1) ?? first.at;

  return {
    key,
    question: first.q,
    answers,
    asked,
    people: asked.filter((a) => a.name || a.answers.length > 0).length,
    topic: answers.find((c) => c.topic)?.topic ?? "",
    ...(answers.find((c) => c.place) ? { place: answers.find((c) => c.place)!.place } : {}),
    firstAsked: first.at,
    latest,
    things: answers.reduce((n, c) => n + c.things.length, 0),
    unseen: answers.some((c) => c.unseen),
  };
}

/** Every question you've asked, in person or by link, newest activity first. */
export function listQuestions(captures: Capture[], outgoing: Outgoing[], people: PersonRecord[]): QuestionCollection[] {
  const groups = new Map<string, { captures: Capture[]; outgoing: Outgoing[] }>();
  const at = (key: string) => groups.get(key) ?? groups.set(key, { captures: [], outgoing: [] }).get(key)!;
  for (const c of captures) at(groupOf(c)).captures.push(c);
  for (const o of outgoing) at(o.group).outgoing.push(o);
  return [...groups.entries()]
    .map(([key, g]) => collect(key, g.captures, g.outgoing, people))
    .sort((a, b) => b.latest.localeCompare(a.latest));
}

export function findQuestion(
  key: string,
  captures: Capture[],
  outgoing: Outgoing[],
  people: PersonRecord[],
): QuestionCollection | undefined {
  const mine = captures.filter((c) => groupOf(c) === key);
  const sent = outgoing.filter((o) => o.group === key);
  if (mine.length === 0 && sent.length === 0) return undefined;
  return collect(key, mine, sent, people);
}

/** Asked more than one person, or answered by more than one: a question with perspectives. */
export const isShared = (q: QuestionCollection) => q.people > 1 || q.answers.length > 1;

/** "4 perspectives", "One perspective" */
export function perspectivesLine(n: number): string {
  return n === 1 ? "One perspective" : `${n} perspectives`;
}

/** "Asked 4 people" */
export function askedLine(q: QuestionCollection): string {
  const open = q.asked.some((a) => !a.name && a.answers.length === 0);
  const n = q.people;
  if (n === 0) return "Anyone with the link can answer";
  return `Asked ${n === 1 ? "one person" : `${n} people`}${open ? ", and anyone with the link" : ""}`;
}

/** "2 of 4 answered", "All 3 answered", "No answers yet" */
export function answeredLine(q: QuestionCollection): string {
  const n = q.answers.length;
  if (n === 0) return "No answers yet";
  if (n >= q.people) return q.people === 1 ? "Answered" : `All ${q.people} answered`;
  return `${n} of ${q.people} answered`;
}

/** "Sarah, Jason and Maya", "Sarah, Jason and 2 others" */
export function namesOf(names: string[], max = 3): string {
  const named = names.map((n) => n.trim()).filter(Boolean);
  if (named.length <= max) return listOf(named);
  return `${named.slice(0, max - 1).join(", ")} and ${named.length - (max - 1)} others`;
}

/**
 * Who answered, with a date when the same person answered more than once:
 * people's answers change, and both stay.
 */
export function answerNames(answers: Capture[], date: (iso: string) => string): string[] {
  return answers.map((c) => {
    const name = c.person.trim() || "Someone";
    const again = answers.filter((d) => d.person.trim() === c.person.trim()).length > 1;
    return again ? `${name}, ${date(c.recordedAt)}` : name;
  });
}
