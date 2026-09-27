import type { Capture, Thing } from "./types";

/**
 * The Library's understanding of what the user has kept:
 * people → questions → things worth remembering.
 *
 * Nothing here merges or summarizes what different people said. Every
 * conversation and every thing stays attached to the person it came from.
 */

export function personKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function topicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

export interface Person {
  key: string;
  /** As the user last wrote it. */
  name: string;
  /** Newest first. */
  conversations: Capture[];
  things: number;
  /** Most common first. */
  topics: string[];
  places: string[];
}

export interface Topic {
  key: string;
  name: string;
  /** Newest first. */
  conversations: Capture[];
  /** Everyone who has taught the user something about this, most recent first. */
  people: string[];
}

function newestFirst(a: Capture, b: Capture) {
  return b.recordedAt.localeCompare(a.recordedAt);
}

function byFrequency(values: string[]): string[] {
  const counts = new Map<string, { value: string; n: number; first: number }>();
  values.forEach((value, i) => {
    const key = value.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.n += 1;
    else counts.set(key, { value, n: 1, first: i });
  });
  return [...counts.values()].sort((a, b) => b.n - a.n || a.first - b.first).map((e) => e.value);
}

/** The people the user has learned from. Unnamed conversations aren't anyone yet. */
export function listPeople(captures: Capture[]): Person[] {
  const groups = new Map<string, Capture[]>();
  for (const capture of [...captures].sort(newestFirst)) {
    const key = personKey(capture.person);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), capture]);
  }
  return [...groups.entries()].map(([key, conversations]) => ({
    key,
    name: conversations[0].person.trim(),
    conversations,
    things: conversations.reduce((n, c) => n + c.things.length, 0),
    topics: byFrequency(conversations.map((c) => c.topic).filter(Boolean)),
    places: byFrequency(conversations.flatMap((c) => (c.place ? [c.place] : []))),
  }));
}

export function findPerson(captures: Capture[], key: string): Person | undefined {
  return listPeople(captures).find((p) => p.key === key);
}

/** Topics emerge from what was asked. Most-visited first. */
export function listTopics(captures: Capture[]): Topic[] {
  const groups = new Map<string, Capture[]>();
  for (const capture of [...captures].sort(newestFirst)) {
    const key = topicKey(capture.topic);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), capture]);
  }
  return [...groups.entries()]
    .map(([key, conversations]) => ({
      key,
      name: conversations[0].topic.trim(),
      conversations,
      people: byFrequency(conversations.flatMap((c) => (c.person.trim() ? [c.person.trim()] : []))),
    }))
    .sort((a, b) => b.conversations.length - a.conversations.length || a.name.localeCompare(b.name));
}

export function findTopic(captures: Capture[], key: string): Topic | undefined {
  return listTopics(captures).find((t) => t.key === key);
}

/** Places mentioned so far. Quiet metadata today; a Places view later. */
export function listPlaces(captures: Capture[]): string[] {
  return byFrequency(captures.flatMap((c) => (c.place ? [c.place] : [])));
}

// ── Search ──────────────────────────────────────────────────

function fold(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'");
}

function words(text: string): string[] {
  return fold(text).match(/[\p{L}\p{N}']+/gu) ?? [];
}

/** A gentle stem, so "hiring" finds "hire" and "founders" finds "founder". */
export function stem(term: string): string {
  if (term.length > 5 && term.endsWith("ing")) return term.slice(0, -3);
  if (term.length > 4 && term.endsWith("ied")) return `${term.slice(0, -3)}y`;
  if (term.length > 4 && term.endsWith("ed")) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

/**
 * Words that shape a question but don't say what it's about. "What should I do
 * in Boston?" is a search for Boston, not for "what", "should" and "do".
 */
const FILLER = new Set(
  (
    "a an the and or but if so of to in on at for from with about into by as than then " +
    "what what's whats which who whom whose where when why how " +
    "should would could can can't will shall may might must " +
    "do does did done doing go going get got " +
    "i i'm im me my mine we us our you your yours he him his she her they them their it its " +
    "is am are was were be been being have has had " +
    "that this these those there here any some anything something " +
    "three thing things say said tell told talk talked know " +
    "best good top tip tips idea ideas advice recommend please"
  ).split(" "),
);

/** The words that carry the meaning, as typed. Filler drops out unless nothing else is left. */
function meaningfulWords(query: string): string[] {
  const all = query.match(/[\p{L}\p{N}'’]+/gu) ?? [];
  const kept = all.filter((w) => !FILLER.has(fold(w)));
  return kept.length > 0 ? kept : all;
}

/** The query as stems. Every stem has to be found for something to match. */
export function queryTerms(query: string): string[] {
  return [...new Set(meaningfulWords(query).map((w) => stem(fold(w))).filter(Boolean))];
}

/** True when every term begins a word somewhere in the text. */
export function matchesAll(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const ws = words(text);
  return terms.every((term) => ws.some((w) => w.startsWith(term)));
}

/** True when at least one term begins a word in the text. */
export function matchesAny(text: string, terms: string[]): boolean {
  const ws = words(text);
  return terms.some((term) => ws.some((w) => w.startsWith(term)));
}

/**
 * Splits text into plain and matching parts, for highlighting.
 * Matches are words that begin with one of the terms.
 */
export function highlightParts(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (terms.length === 0) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const re = /[\p{L}\p{N}'’]+/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const word = fold(m[0]);
    if (!terms.some((t) => word.startsWith(t))) continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    last = end;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

export interface PersonResult {
  person: Person;
  /** Found by name, or because what they told you is about the search. */
  by: "name" | "mention";
  /** How many of their conversations it came up in. */
  conversations: number;
  /** Things they told you about it: every thing from a conversation about it, plus single things elsewhere. */
  things: number;
  /** It only came up in passing, inside conversations about something else. */
  inPassing: boolean;
  /** The topic of that conversation, when it came up in passing exactly once. */
  topic?: string;
  /** What was searched for, in words, leaving out their own name. */
  subject: string;
}

export interface ThingResult {
  capture: Capture;
  thing: Thing;
  index: number;
  /** The thing itself mentions it, rather than the conversation it came from. */
  direct: boolean;
}

export interface SearchResults {
  people: PersonResult[];
  questions: Capture[];
  things: ThingResult[];
  terms: string[];
  /** What was searched for, in words: "Boston", "hiring". */
  subject: string;
  /**
   * When nothing matched every word, the results are about the names, places
   * and topics in the search instead, and this says which.
   */
  broadened?: string;
}

function conversationText(c: Capture): string {
  return `${c.question} ${c.topic} ${c.place ?? ""}`;
}

function thingText(t: Thing): string {
  return `${t.headline} ${t.detail}`;
}

/**
 * True when the search is found in the text. Words of the person's name count
 * too ("Mom cooking"), but only alongside something they actually talked about.
 */
function found(text: string, person: string, terms: string[]): boolean {
  const content = words(text);
  const name = words(person);
  let aboutSomething = false;
  for (const term of terms) {
    if (content.some((w) => w.startsWith(term))) aboutSomething = true;
    else if (!name.some((w) => w.startsWith(term))) return false;
  }
  return aboutSomething;
}

/**
 * How a word should read back to the user: "Boston" as they'd write it,
 * "hiring" in lower case. Capitalized only where the conversations capitalize
 * it mid-sentence, or where it's a person or place.
 */
function asWritten(word: string, captures: Capture[]): string {
  const target = fold(word);
  for (const c of captures) {
    for (const proper of [c.place ?? "", c.person]) {
      const hit = proper.match(/[\p{L}\p{N}'’]+/gu)?.find((w) => fold(w) === target);
      if (hit) return hit;
    }
  }
  for (const c of captures) {
    for (const text of [c.question, ...c.things.flatMap((t) => [t.headline, t.detail])]) {
      for (const m of text.matchAll(/[\p{L}\p{N}'’]+/gu)) {
        if (fold(m[0]) !== target || !/^\p{Lu}/u.test(m[0])) continue;
        const before = text.slice(0, m.index).trimEnd();
        if (before !== "" && !/[.!?:"“]$/.test(before)) return m[0];
      }
    }
  }
  return word.toLowerCase();
}

function describe(words: string[], captures: Capture[]): string {
  return words.map((w) => asWritten(w, captures)).join(" ");
}

function search(captures: Capture[], terms: string[], typed: string[]): Omit<SearchResults, "broadened"> {
  const subject = describe(typed, captures);
  const empty = { people: [], questions: [], things: [], terms, subject };
  if (terms.length === 0) return empty;

  const sorted = [...captures].sort(newestFirst);
  const aboutIt = new Set(sorted.filter((c) => found(conversationText(c), c.person, terms)).map((c) => c.id));
  const questions = sorted.filter((c) => aboutIt.has(c.id));

  // A thing is found by its own words, or because the whole conversation was about it.
  const direct: ThingResult[] = [];
  const context: ThingResult[] = [];
  for (const capture of sorted) {
    capture.things.forEach((thing, index) => {
      if (found(thingText(thing), capture.person, terms)) direct.push({ capture, thing, index, direct: true });
      else if (found(`${thingText(thing)} ${conversationText(capture)}`, capture.person, terms))
        context.push({ capture, thing, index, direct: false });
    });
  }

  const people: PersonResult[] = [];
  for (const person of listPeople(captures)) {
    const own = typed.filter((w) => !matchesAll(person.name, [stem(fold(w))]));
    const base = { person, subject: describe(own, captures) };
    if (matchesAll(person.name, terms)) {
      people.push({ ...base, by: "name", conversations: 0, things: 0, inPassing: false });
      continue;
    }
    const about = person.conversations.filter((c) => aboutIt.has(c.id));
    const passing = direct.filter((r) => personKey(r.capture.person) === person.key && !aboutIt.has(r.capture.id));
    const passingIn = [...new Set(passing.map((r) => r.capture))];
    if (about.length + passingIn.length === 0) continue;
    people.push({
      ...base,
      by: "mention",
      conversations: about.length + passingIn.length,
      things: about.reduce((n, c) => n + c.things.length, 0) + passing.length,
      inPassing: about.length === 0,
      topic: about.length === 0 && passingIn.length === 1 ? passingIn[0].topic || undefined : undefined,
    });
  }
  const rank = (r: PersonResult) => (r.by === "name" ? 0 : r.inPassing ? 2 : 1);
  people.sort((a, b) => rank(a) - rank(b) || b.things - a.things);

  return { people, questions, things: [...direct, ...context], terms, subject };
}

/**
 * Searching your own memory: who said it, what you asked, what they said.
 * It only ever finds what people actually told you, and every result keeps its source.
 */
export function searchLibrary(captures: Capture[], query: string): SearchResults {
  const typed = meaningfulWords(query);
  const terms = queryTerms(query);
  const results = search(captures, terms, typed);
  if (terms.length < 2 || results.people.length + results.questions.length + results.things.length > 0) return results;

  // Nothing matched every word. If the search names someone, somewhere or a
  // topic you have, show what you have about that instead, and say so.
  const known = words(captures.map((c) => `${c.person} ${c.place ?? ""} ${c.topic}`).join(" "));
  const named = typed.filter((w) => known.some((k) => k.startsWith(stem(fold(w)))));
  if (named.length === 0 || named.length === typed.length) return results;
  const broader = search(captures, [...new Set(named.map((w) => stem(fold(w))))], named);
  if (broader.people.length + broader.questions.length + broader.things.length === 0) return results;
  return { ...broader, broadened: broader.subject };
}

/** How someone came up in a search: "Told you 3 things about Boston". */
export function mentionLine(result: PersonResult): string | undefined {
  const { by, subject, inPassing, things, conversations, topic } = result;
  if (by === "name" || !subject) return undefined;
  if (!inPassing) return `Told you ${things} ${things === 1 ? "thing" : "things"} about ${subject}`;
  if (conversations > 1) return `Mentioned ${subject} in ${conversations} conversations`;
  const kind = topic ? topic.toLowerCase() : "";
  return `Mentioned ${subject} in ${kind ? `${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind}` : "a"} conversation`;
}
