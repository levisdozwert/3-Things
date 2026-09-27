import { describe, expect, it } from "vitest";
import {
  findPerson,
  highlightParts,
  listPeople,
  listPlaces,
  listTopics,
  matchesAll,
  queryTerms,
  searchLibrary,
  stem,
} from "../src/lib/library";
import { seedCaptures } from "../src/lib/samples";
import { refreshSamples } from "../src/lib/store";
import type { Capture } from "../src/lib/types";

const library = seedCaptures(new Date("2026-09-27T20:00:00"));

describe("people", () => {
  it("brings one person's conversations together", () => {
    const jason = findPerson(library, "jason")!;
    expect(jason.conversations.length).toBe(4);
    expect(jason.things).toBe(12);
    expect(jason.topics[0]).toBe("Startup");
    // Newest first.
    expect(jason.conversations[0].question).toBe("What are three things first-time founders get wrong?");
  });

  it("treats a name the same however it's capitalized", () => {
    const extra: Capture = { ...library[0], id: "x", person: "  jason " };
    expect(listPeople([...library, extra]).filter((p) => p.key === "jason")).toHaveLength(1);
  });

  it("leaves unnamed conversations out of People", () => {
    const unnamed: Capture = { ...library[0], id: "y", person: "" };
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
    expect(results.people.map((p) => p.person.name)).toEqual(["Sarah"]);
    expect(results.people[0].by).toBe("mention");
    expect(results.questions.map((c) => c.question)).toEqual(
      expect.arrayContaining([
        "What are three places I shouldn't miss in Boston?",
        "What are three things you'd tell someone moving to Boston?",
      ]),
    );
    expect(results.things.some((r) => r.thing.headline === "The courtyard at the Boston Public Library")).toBe(true);
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

describe("refreshSamples", () => {
  const settings = { name: "", consentReminder: true, keepRecordings: true, showSamples: true };

  it("adds new sample conversations once, and never touches the user's own", () => {
    const mine: Capture = { ...library[0], id: "mine", origin: "recording", question: "My own question?" };
    const older = { captures: [mine, library[0]], settings };
    const refreshed = refreshSamples(older);
    expect(refreshed.captures.find((c) => c.id === "mine")).toEqual(mine);
    expect(refreshed.captures.length).toBe(library.length + 1);

    // A sample the user removed stays removed.
    const removed = refreshSamples({ ...refreshed, captures: refreshed.captures.filter((c) => c.id !== library[1].id) });
    expect(removed.captures.some((c) => c.id === library[1].id)).toBe(false);
  });

  it("keeps an edited sample exactly as the user left it", () => {
    const edited: Capture = { ...library[0], edited: true, topic: "Mine" };
    const refreshed = refreshSamples({ captures: [edited], settings, seeded: library.map((c) => c.id) });
    expect(refreshed.captures[0].topic).toBe("Mine");
  });
});
