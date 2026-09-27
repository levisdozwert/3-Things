import { describe, expect, it } from "vitest";
import {
  findPerson,
  highlightParts,
  listPeople,
  listPlaces,
  listTopics,
  matchesAll,
  mentionLine,
  queryTerms,
  searchLibrary,
  stem,
} from "../src/lib/library";
import { seedCaptures } from "../src/lib/samples";
import { defaultSettings, refreshSamples } from "../src/lib/store";
import { yearOfConversations } from "../src/lib/yearOfConversations";
import type { Capture } from "../src/lib/types";

const library = seedCaptures(new Date("2026-09-27T20:00:00"));

describe("people", () => {
  it("brings one person's conversations together", () => {
    const jason = findPerson(library, "person-jason")!;
    expect(jason.conversations.length).toBe(4);
    expect(jason.things).toBe(12);
    expect(jason.topics[0]).toBe("Startup");
    // Newest first.
    expect(jason.conversations[0].question).toBe("What are three things first-time founders get wrong?");
  });

  it("treats a name the same however it's capitalized", () => {
    // Saved before people had records: matched to the same Jason by name.
    const extra: Capture = { ...library[0], id: "x", person: "  jason ", personIds: undefined };
    expect(listPeople([...library, extra]).filter((p) => p.key === "person-jason")).toHaveLength(1);
  });

  it("leaves unnamed conversations out of People", () => {
    const unnamed: Capture = { ...library[0], id: "y", person: "", personIds: [] };
    expect(listPeople([unnamed])).toEqual([]);
  });
});

describe("topics and places", () => {
  it("gathers different people's views on the same subject, separately", () => {
    const startup = listTopics(library).find((t) => t.key === "startup")!;
    expect(startup.people).toEqual(expect.arrayContaining(["Jason", "Maya", "Carlos"]));
    // Jason says hire slowly; Maya says hire faster. Both stay.
    const headlines = startup.conversations.flatMap((c) => c.things.map((t) => t.headline));
    expect(headlines).toContain("Hire more slowly than you think you need to");
    expect(headlines).toContain("Hire faster than feels comfortable");
  });

  it("lists the places conversations were about", () => {
    expect(listPlaces(library)).toEqual(expect.arrayContaining(["Boston", "Jersey City"]));
  });
});

describe("search", () => {
  it("stems gently", () => {
    expect(stem("hiring")).toBe("hir");
    expect(stem("founders")).toBe("founder");
    expect(stem("boss")).toBe("boss");
    expect(queryTerms("Hiring  Founders")).toEqual(["hir", "founder"]);
  });

  it("matches the start of words, so it feels like remembering", () => {
    expect(matchesAll("Hire more slowly than you think", ["hir"])).toBe(true);
    expect(matchesAll("What are three places in Boston?", ["ton"])).toBe(false);
  });

  it("finds an answer Jason gave months ago by a word in it", () => {
    const { things } = searchLibrary(library, "hiring");
    const jasons = things.filter((r) => r.capture.person === "Jason").map((r) => r.thing.headline);
    expect(jasons).toContain("Hire more slowly than you think you need to");
    // Maya's different view shows up too, with her name on it.
    expect(things.some((r) => r.capture.person === "Maya" && r.thing.headline === "Hire faster than feels comfortable")).toBe(true);
  });

  it("groups Boston into people who talked about it, questions and things", () => {
    const results = searchLibrary(library, "Boston");
    expect(results.people.map((p) => p.person.name)).toEqual(["Sarah", "Daniel"]);
    expect(results.people.map(mentionLine)).toEqual([
      "Told you 6 things about Boston",
      "Mentioned Boston in a travel conversation",
    ]);
    expect(results.questions.map((c) => c.question)).toEqual(
      expect.arrayContaining([
        "What are three places I shouldn't miss in Boston?",
        "What are three things you'd tell someone moving to Boston?",
      ]),
    );
    expect(results.things.some((r) => r.thing.headline === "The courtyard at the Boston Public Library")).toBe(true);
  });

  it("answers a question with conversations, never with an answer of its own", () => {
    expect(queryTerms("What should I do in Boston?")).toEqual(["boston"]);
    const asked = searchLibrary(library, "What should I do in Boston?");
    const plain = searchLibrary(library, "Boston");
    expect(asked.subject).toBe("Boston");
    expect(asked.questions).toEqual(plain.questions);
    expect(asked.things).toEqual(plain.things);
    // Every thing it shows is one somebody said, with them attached.
    for (const { capture, thing } of asked.things) expect(capture.things).toContain(thing);
  });

  it("lists the things from a conversation about the search, each with its source", () => {
    const { things } = searchLibrary(library, "founder");
    const fromJason = things.filter((r) => r.capture.person === "Jason").map((r) => r.thing.headline);
    expect(fromJason).toContain("Building too long before talking to customers");
    expect(fromJason).toContain("Hire more slowly than you think you need to");
  });

  it("puts things that mention the search first", () => {
    const { things } = searchLibrary(library, "Boston");
    const firstIndirect = things.findIndex((r) => !r.direct);
    expect(things.slice(0, firstIndirect).every((r) => r.direct)).toBe(true);
    expect(things.slice(firstIndirect).every((r) => !r.direct)).toBe(true);
    expect(things.slice(0, firstIndirect).map((r) => r.thing.headline)).toContain("Fly into Boston and drive up");
  });

  it("understands a person and a subject together", () => {
    const results = searchLibrary(library, "Mom cooking");
    expect(results.questions.map((c) => c.person)).toEqual(["Mom"]);
    expect(results.people.map(mentionLine)).toEqual(["Told you 3 things about cooking"]);
  });

  it("says so when it has to show something broader", () => {
    const results = searchLibrary(library, "Where can I get sushi in Boston?");
    expect(results.broadened).toBe("Boston");
    expect(results.questions.every((c) => c.place === "Boston")).toBe(true);
    expect(searchLibrary(library, "sushi").broadened).toBeUndefined();
  });

  it("finds people by name first", () => {
    const results = searchLibrary(library, "mom");
    expect(results.people[0]).toMatchObject({ by: "name" });
    expect(results.people[0].person.name).toBe("Mom");
  });

  it("never detaches a thing from the person who said it", () => {
    for (const { capture, thing } of searchLibrary(library, "the").things) {
      expect(capture.things).toContain(thing);
    }
  });

  it("returns nothing for an empty search", () => {
    expect(searchLibrary(library, "   ")).toMatchObject({ people: [], questions: [], things: [] });
  });

  it("marks the matching words", () => {
    expect(highlightParts("Hire more slowly", ["hir"])).toEqual([
      { text: "Hire", match: true },
      { text: " more slowly", match: false },
    ]);
  });
});

describe("a year of conversations", () => {
  const year = yearOfConversations(new Date("2026-09-27T20:00:00"));
  const full = [...library, ...year];

  it("holds hundreds of things from dozens of people", () => {
    expect(new Set(year.map((c) => c.id)).size).toBe(year.length);
    expect(full.reduce((n, c) => n + c.things.length, 0)).toBeGreaterThan(250);
    expect(listPeople(full).length).toBeGreaterThanOrEqual(25);
  });

  it("still finds Boston across people, in passing or not", () => {
    const names = searchLibrary(full, "Boston").people.map((p) => p.person.name);
    expect(names).toEqual(expect.arrayContaining(["Sarah", "Tom", "Daniel"]));
  });
});

describe("refreshSamples", () => {
  const settings = defaultSettings;

  it("adds new sample conversations once, and never touches the user's own", () => {
    const mine: Capture = { ...library[0], id: "mine", origin: "recording", question: "My own question?" };
    const older = { captures: [mine, library[0]], people: [], settings };
    const refreshed = refreshSamples(older);
    expect(refreshed.captures.find((c) => c.id === "mine")).toEqual(mine);
    expect(refreshed.captures.length).toBe(library.length + 1);

    // A sample the user removed stays removed.
    const removed = refreshSamples({ ...refreshed, captures: refreshed.captures.filter((c) => c.id !== library[1].id) });
    expect(removed.captures.some((c) => c.id === library[1].id)).toBe(false);
  });

  it("keeps an edited sample exactly as the user left it", () => {
    const edited: Capture = { ...library[0], edited: true, topic: "Mine" };
    const refreshed = refreshSamples({ captures: [edited], people: [], settings, seeded: library.map((c) => c.id) });
    expect(refreshed.captures[0].topic).toBe("Mine");
  });
});
