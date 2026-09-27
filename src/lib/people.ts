import { personIdFor, queryTerms, speakersOf } from "./library";
import type { Capture, PersonRecord } from "./types";

/**
 * People are lightweight and private: a name the user chose, maybe a note or a
 * photo. Name someone once, recognize them later. Nothing here ever looks
 * outside the user's own Library, and nothing identifies anyone by their face.
 */

/** How names compare: case and spacing don't matter. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export { personIdFor };

/** Who answered, as the flow knows it: someone already in the Library, or a new name. */
export type Speaker = { id: string } | { name: string };

export function isNew(speaker: Speaker): speaker is { name: string } {
  return "name" in speaker;
}

/** "Jason", "Jason + Sarah", or "" when nobody was named. */
export function labelFor(names: string[]): string {
  return names
    .map((n) => n.trim())
    .filter(Boolean)
    .join(" + ");
}

export function speakerLabel(speakers: Speaker[], people: PersonRecord[]): string {
  const byId = new Map(people.map((p) => [p.id, p]));
  return labelFor(speakers.map((s) => (isNew(s) ? s.name : (byId.get(s.id)?.name ?? ""))));
}

/** The people a conversation points to, including conversations saved before records existed. */
export const idsOf = speakersOf;

function relabel(capture: Capture, byId: Map<string, PersonRecord>): Capture {
  const ids = idsOf(capture);
  const person = labelFor(ids.map((id) => byId.get(id)?.name ?? ""));
  return capture.person === person && capture.personIds === ids ? capture : { ...capture, personIds: ids, person };
}

/**
 * Makes sure every named conversation points at a person, and reads as that
 * person's current name. Conversations saved before people had records are
 * matched by name; `notes` gives sample people their context.
 */
export function reconcile(
  captures: Capture[],
  people: PersonRecord[],
  notes: Record<string, string> = {},
  now = new Date(),
): { captures: Capture[]; people: PersonRecord[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  const byName = new Map(people.map((p) => [nameKey(p.name), p]));
  const records = [...people];

  const add = (id: string, name: string) => {
    const record: PersonRecord = {
      id,
      name: name.trim() || "Someone",
      createdAt: now.toISOString(),
      ...(notes[name.trim()] ? { note: notes[name.trim()] } : {}),
    };
    byId.set(id, record);
    byName.set(nameKey(record.name), record);
    records.push(record);
    return record;
  };

  const linked = captures.map((c) => {
    if (c.personIds) {
      const names = c.person.split(" + ");
      c.personIds.forEach((id, i) => byId.has(id) || add(id, names[i] ?? ""));
      return c;
    }
    const name = c.person.trim();
    if (!name) return { ...c, personIds: [] };
    const person = byName.get(nameKey(name)) ?? add(personIdFor(name), name);
    return { ...c, personIds: [person.id] };
  });

  return { captures: linked.map((c) => relabel(c, byId)), people: records };
}

/** People exist because the user had a conversation with them. */
export function withoutOrphans(captures: Capture[], people: PersonRecord[]): PersonRecord[] {
  const referenced = new Set(captures.flatMap(idsOf));
  return people.filter((p) => referenced.has(p.id));
}

/** Renames reach every conversation they're part of. */
export function renamed(captures: Capture[], people: PersonRecord[]): Capture[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return captures.map((c) => relabel(c, byId));
}

/**
 * Two records turn out to be one person. Their conversations come together
 * under one name; nothing is deleted, and each conversation keeps its date.
 */
export function merge(
  captures: Capture[],
  people: PersonRecord[],
  fromId: string,
  intoId: string,
  name?: string,
): { captures: Capture[]; people: PersonRecord[] } {
  const from = people.find((p) => p.id === fromId);
  const into = people.find((p) => p.id === intoId);
  if (!from || !into || fromId === intoId) return { captures, people };
  const kept: PersonRecord = {
    ...into,
    name: name?.trim() || into.name,
    ...(into.note || from.note ? { note: into.note || from.note } : {}),
    ...(into.photo || from.photo ? { photo: into.photo || from.photo } : {}),
  };
  const nextPeople = people.filter((p) => p.id !== fromId).map((p) => (p.id === intoId ? kept : p));
  const moved = captures.map((c) => {
    const ids = idsOf(c);
    if (!ids.includes(fromId)) return c;
    return { ...c, personIds: [...new Set(ids.map((id) => (id === fromId ? intoId : id)))] };
  });
  return { captures: renamed(moved, nextPeople), people: nextPeople };
}

/**
 * Removes a person and the conversations that were theirs alone. Conversations
 * they shared with others stay, without their name. Returns what was removed.
 */
export function removePerson(
  captures: Capture[],
  people: PersonRecord[],
  id: string,
): { captures: Capture[]; people: PersonRecord[]; removed: string[] } {
  const removed: string[] = [];
  const nextPeople = people.filter((p) => p.id !== id);
  const kept = captures.flatMap((c) => {
    const ids = idsOf(c);
    if (!ids.includes(id)) return [c];
    if (ids.length === 1) {
      removed.push(c.id);
      return [];
    }
    return [{ ...c, personIds: ids.filter((x) => x !== id) }];
  });
  return { captures: renamed(kept, nextPeople), people: nextPeople, removed };
}

// ── Duplicates ───────────────────────────────────────────────

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/**
 * People very likely entered twice: the same name, or a first name alone next
 * to the only full name that starts with it ("Jason" and "Jason Patel").
 * Anything less certain isn't worth interrupting anyone for.
 */
export function likelyDuplicates<P extends { id: string; name: string }>(
  people: P[],
  separate: Iterable<string> = [],
): [P, P][] {
  const dismissed = new Set(separate);
  const pairs: [P, P][] = [];
  const words = (p: P) => nameKey(p.name).split(" ");
  const offer = (a: P, b: P) => {
    if (!dismissed.has(pairKey(a.id, b.id))) pairs.push([a, b]);
  };

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      if (nameKey(people[i].name) === nameKey(people[j].name)) offer(people[i], people[j]);
    }
  }

  const single = people.filter((p) => words(p).length === 1);
  const full = people.filter((p) => words(p).length > 1);
  for (const one of single) {
    const first = words(one)[0];
    const sameFirst = full.filter((p) => words(p)[0] === first);
    const alsoAlone = single.filter((p) => words(p)[0] === first);
    if (sameFirst.length === 1 && alsoAlone.length === 1) offer(one, sameFirst[0]);
  }
  return pairs;
}

// ── Asking again ─────────────────────────────────────────────

/** How alike two questions are, by the words that carry their meaning (0 to 1). */
export function questionSimilarity(a: string, b: string): number {
  const x = new Set(queryTerms(a));
  const y = new Set(queryTerms(b));
  if (x.size === 0 || y.size === 0) return 0;
  const shared = [...x].filter((t) => y.has(t)).length;
  return shared / (x.size + y.size - shared);
}

/**
 * The most recent time the user asked this person something very like this.
 * Never a reason to stop: people's answers change, and both moments are kept.
 */
export function askedBefore(captures: Capture[], personId: string, question: string): Capture | undefined {
  return captures
    .filter((c) => idsOf(c).includes(personId) && questionSimilarity(c.question, question) >= 0.6)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

/** People whose name (or private note) starts with what's typed. Names first. */
export function matchPeople<P extends { name: string; note?: string }>(people: P[], query: string): P[] {
  const typed = nameKey(query).split(" ").filter(Boolean);
  if (typed.length === 0) return [];
  const starts = (text: string) => {
    const ws = nameKey(text).split(/[\s,.;:()—–-]+/);
    return typed.every((t) => ws.some((w) => w.startsWith(t)));
  };
  const byName = people.filter((p) => starts(p.name));
  const byNote = people.filter((p) => !byName.includes(p) && p.note && starts(p.note));
  return [...byName, ...byNote];
}
