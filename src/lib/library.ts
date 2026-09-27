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

/** The query as stems. Every stem has to be found for something to match. */
export function queryTerms(query: string): string[] {
  return words(query).map(stem).filter(Boolean);
}

/** True when every term begins a word somewhere in the text. */
export function matchesAll(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const ws = words(text);
  return terms.every((term) => ws.some((w) => w.startsWith(term)));
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
  /** Found by name, or because their conversations mention the search. */
  by: "name" | "mention";
  /** For "mention": how many of their conversations do. */
  mentions: number;
}

export interface ThingResult {
  capture: Capture;
  thing: Thing;
  index: number;
}

export interface SearchResults {
  people: PersonResult[];
  questions: Capture[];
  things: ThingResult[];
  terms: string[];
}

function conversationText(c: Capture): string {
  return `${c.question} ${c.topic} ${c.place ?? ""}`;
}

function thingText(t: Thing): string {
  return `${t.headline} ${t.detail}`;
}

/**
 * Searching your own memory: who said it, what you asked, what they said.
 * Every result keeps its source.
 */
export function searchLibrary(captures: Capture[], query: string): SearchResults {
  const terms = queryTerms(query);
  const empty = { people: [], questions: [], things: [], terms };
  if (terms.length === 0) return empty;

  const sorted = [...captures].sort(newestFirst);
  const questions = sorted.filter((c) => matchesAll(conversationText(c), terms));
  const things = sorted.flatMap((capture) =>
    capture.things.flatMap((thing, index) => (matchesAll(thingText(thing), terms) ? [{ capture, thing, index }] : [])),
  );

  const people: PersonResult[] = [];
  for (const person of listPeople(captures)) {
    if (matchesAll(person.name, terms)) {
      people.push({ person, by: "name", mentions: 0 });
      continue;
    }
    const mentions = person.conversations.filter(
      (c) => matchesAll(conversationText(c), terms) || c.things.some((t) => matchesAll(thingText(t), terms)),
    ).length;
    if (mentions > 0) people.push({ person, by: "mention", mentions });
  }
  people.sort((a, b) => (a.by === b.by ? b.mentions - a.mentions : a.by === "name" ? -1 : 1));

  return { people, questions, things, terms };
}
