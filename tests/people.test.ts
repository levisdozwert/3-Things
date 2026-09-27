import { describe, expect, it } from "vitest";
import { listPeople, searchLibrary } from "../src/lib/library";
import {
  askedBefore,
  likelyDuplicates,
  matchPeople,
  merge,
  pairKey,
  questionSimilarity,
  reconcile,
  removePerson,
  renamed,
  withoutOrphans,
} from "../src/lib/people";
import { sampleNotes, seedCaptures } from "../src/lib/samples";
import type { Capture, PersonRecord } from "../src/lib/types";

const now = new Date("2026-09-27T20:00:00");
const { captures: library, people } = reconcile(seedCaptures(now), [], sampleNotes, now);
const jason = people.find((p) => p.name === "Jason")!;
const patel = people.find((p) => p.name === "Jason Patel")!;
const sarah = people.find((p) => p.name === "Sarah")!;

describe("people as records", () => {
  it("names someone once and recognizes them later", () => {
    const jasons = library.filter((c) => c.personIds?.includes(jason.id));
    expect(jasons.length).toBe(4);
    expect(jason.note).toBe("Former colleague from my first startup");
  });

  it("links conversations saved before people had records, by name", () => {
    const old: Capture = { ...library[0], id: "old", person: "jason", personIds: undefined };
    const { captures, people: after } = reconcile([...library, old], people, {}, now);
    expect(captures.find((c) => c.id === "old")?.personIds).toEqual([jason.id]);
    // Reads as the person's name, not as it was once typed.
    expect(captures.find((c) => c.id === "old")?.person).toBe("Jason");
    expect(after.length).toBe(people.length);
  });

  it("carries a new name everywhere the person appears", () => {
    const next = people.map((p) => (p.id === sarah.id ? { ...p, name: "Sarah K." } : p));
    const relabeled = renamed(library, next).filter((c) => c.personIds?.includes(sarah.id));
    expect(relabeled.length).toBeGreaterThan(0);
    expect(relabeled.every((c) => c.person === "Sarah K.")).toBe(true);
  });

  it("keeps people only while they have conversations", () => {
    const loner: PersonRecord = { id: "p-x", name: "Nobody", createdAt: now.toISOString() };
    expect(withoutOrphans(library, [...people, loner]).some((p) => p.id === "p-x")).toBe(false);
  });
});

describe("several people in one conversation", () => {
  const together: Capture = { ...library[0], id: "group", personIds: [jason.id, sarah.id], person: "" };
  const withGroup = renamed([...library, together], people);

  it("reads as both of them, and belongs to neither alone", () => {
    expect(withGroup.find((c) => c.id === "group")?.person).toBe("Jason + Sarah");
    const everyone = listPeople(withGroup, people);
    const j = everyone.find((p) => p.id === jason.id)!;
    expect(j.conversations.length).toBe(5);
    expect(j.together).toBe(1);
    // Things from a group conversation aren't attributed to any one person.
    expect(j.things).toBe(12);
  });

  it("keeps the conversation when one of them is deleted, without their name", () => {
    const { captures, removed } = removePerson(withGroup, people, jason.id);
    expect(removed.length).toBe(4);
    expect(captures.find((c) => c.id === "group")?.person).toBe("Sarah");
    expect(captures.some((c) => c.personIds?.includes(jason.id))).toBe(false);
  });
});

describe("duplicates", () => {
  it("asks about a first name next to the only full name that starts with it", () => {
    const pairs = likelyDuplicates(people);
    expect(pairs.map(([a, b]) => [a.name, b.name])).toEqual([["Jason", "Jason Patel"]]);
  });

  it("stays quiet when it isn't clear, or when the user already said no", () => {
    const lee: PersonRecord = { id: "p-lee", name: "Jason Lee", createdAt: now.toISOString() };
    expect(likelyDuplicates([...people, lee])).toEqual([]);
    expect(likelyDuplicates(people, [pairKey(jason.id, patel.id)])).toEqual([]);
  });

  it("merges two records into one person, keeping every conversation", () => {
    const { captures, people: after } = merge(library, people, patel.id, jason.id);
    expect(after.some((p) => p.id === patel.id)).toBe(false);
    const theirs = captures.filter((c) => c.personIds?.includes(jason.id));
    expect(theirs.length).toBe(5);
    expect(theirs.every((c) => c.person === "Jason")).toBe(true);
  });

  it("can keep the fuller name when merging", () => {
    const { captures } = merge(library, people, patel.id, jason.id, "Jason Patel");
    expect(captures.filter((c) => c.personIds?.includes(jason.id)).every((c) => c.person === "Jason Patel")).toBe(true);
  });
});

describe("asking someone again", () => {
  it("notices a very similar question, and only for the same person", () => {
    expect(questionSimilarity("What do first-time founders usually get wrong?", "What are three things first-time founders get wrong?")).toBeGreaterThan(0.6);
    expect(askedBefore(library, jason.id, "What do first-time founders usually get wrong?")?.question).toBe(
      "What are three things first-time founders get wrong?",
    );
    expect(askedBefore(library, sarah.id, "What do first-time founders usually get wrong?")).toBeUndefined();
    expect(askedBefore(library, jason.id, "What are three books you love?")).toBeUndefined();
  });

  it("knows a different place makes a different question", () => {
    expect(questionSimilarity("What are three places I shouldn't miss in Chicago?", "What are three places I shouldn't miss in Boston?")).toBe(0);
    expect(askedBefore(library, sarah.id, "What are three places I shouldn't miss in Chicago?")).toBeUndefined();
    expect(askedBefore(library, sarah.id, "What places should I not miss in Boston?")?.place).toBe("Boston");
  });
});

describe("finding someone", () => {
  it("matches the start of a name, then a private note", () => {
    const everyone = listPeople(library, people);
    expect(matchPeople(everyone, "ja").map((p) => p.name)).toEqual(expect.arrayContaining(["Jason", "Jason Patel"]));
    expect(matchPeople(everyone, "running").map((p) => p.name)).toEqual(["Daniel"]);
    expect(matchPeople(everyone, "")).toEqual([]);
  });

  it("makes a person a way into everything they've taught you", () => {
    const results = searchLibrary(library, "Jason", people);
    expect(results.people[0].person.name).toBe("Jason");
    expect(results.questions.filter((c) => c.personIds?.includes(jason.id)).length).toBe(4);
    expect(results.things.filter((r) => r.capture.personIds?.includes(jason.id)).length).toBe(12);
    // His own things come first.
    expect(results.things[0].capture.person).toMatch(/^Jason/);
  });
});
