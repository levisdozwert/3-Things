import { describe, expect, it } from "vitest";
import { closestSample, followUpThings } from "../src/lib/distill/client";
import { groundThing } from "../src/lib/distill/grounding";
import { sampleConversations, seedCaptures, type SampleThing } from "../src/lib/samples";

/** A sample thing must pass grounding completely unchanged: nothing trimmed, nothing dropped. */
function expectFullyGrounded(t: SampleThing, sources: { transcript: string; question: string }) {
  const grounded = groundThing(t, sources);
  expect(grounded, t.headline).not.toBeNull();
  expect(grounded?.headline).toBe(t.headline);
  expect(grounded?.detail).toBe(t.detail);
  expect(grounded?.said).toBe(t.said);
}

describe("sample conversations", () => {
  it.each(sampleConversations.map((c) => [c.key, c] as const))("%s: everything comes from what was said", (_, convo) => {
    const sources = { transcript: convo.transcript, question: convo.question };
    expect(convo.things.length).toBeGreaterThan(0);
    expect(convo.things.length).toBeLessThanOrEqual(3);
    convo.things.forEach((t) => expectFullyGrounded(t, sources));
    if (convo.extra) expectFullyGrounded(convo.extra, sources);

    const more = convo.followUps?.more;
    if (more) more.things.forEach((t) => expectFullyGrounded(t, { ...sources, transcript: `${convo.transcript} ${more.transcript}` }));
    const clarify = convo.followUps?.clarify;
    if (clarify) expectFullyGrounded(clarify.thing, { ...sources, transcript: `${convo.transcript} ${clarify.transcript}` });
  });

  it("covers the messy cases: a correction, a fourth idea, an unclear name, and only two things", () => {
    const founder = sampleConversations.find((c) => c.key === "founder-know")!;
    expect(founder.transcript).toMatch(/hiring fast\. Actually, no\. Hiring carefully/);
    expect(founder.things[0].headline).toBe("Talk to customers before you build anything");
    expect(founder.extra?.headline).toBe("Don't underprice");

    const jersey = sampleConversations.find((c) => c.key === "jersey-places")!;
    expect(jersey.things.some((t) => t.headline.includes("Grove"))).toBe(false);
    expect(jersey.things.find((t) => t.unclear)?.headline).toBe("Try the coffee place near the station");

    const life = sampleConversations.find((c) => c.key === "life-taught")!;
    expect(life.things).toHaveLength(2);
  });
});

describe("seedCaptures", () => {
  it("creates dated library entries, none in the future", () => {
    const now = new Date("2026-09-27T08:00:00");
    const seeds = seedCaptures(now);
    expect(seeds.length).toBe(sampleConversations.filter((c) => c.seed).length);
    for (const capture of seeds) {
      expect(new Date(capture.recordedAt).getTime()).toBeLessThanOrEqual(now.getTime());
      expect(capture.origin).toBe("sample");
    }
  });
});

describe("closestSample", () => {
  it("matches the home and ask screens' example questions", () => {
    expect(closestSample("What are three things life has taught you?").key).toBe("life-taught");
    expect(closestSample("What are three things you wish you knew earlier?").key).toBe("wish-knew-earlier");
    expect(closestSample("What are three things every first-time founder should know?").key).toBe("founder-know");
    expect(closestSample("What are three places I shouldn’t miss in Jersey City?").key).toBe("jersey-places");
  });

  it("matches by the words in a typed question", () => {
    expect(closestSample("What are three places I should visit here?").key).toBe("jersey-city");
    expect(closestSample("What are three places I shouldn't miss in Boston?").key).toBe("boston");
    expect(closestSample("Three books everyone should read?").key).toBe("books");
    expect(closestSample("What should I know about the weather?").key).toBe("learn-from-you");
  });
});

describe("follow-ups in preview", () => {
  it("asking for one more adds only what the speaker said next", async () => {
    const life = sampleConversations.find((c) => c.key === "life-taught")!;
    const added = await followUpThings(
      {
        question: life.question,
        transcript: life.transcript,
        followUp: { kind: "more", asked: "Is there one more thing you’d add?", transcript: "", keep: life.things, want: 1 },
      },
      { preview: true, sample: "life-taught" },
    );
    expect(added.map((t) => t.headline)).toEqual(["Walk every day"]);
    expect(added[0].said).toBe("Half my good decisions happened on walks.");
  });

  it("clarifying replaces the vague thing with what they said, and never invents one otherwise", async () => {
    const jersey = sampleConversations.find((c) => c.key === "jersey-places")!;
    const [clarified] = await followUpThings(
      {
        question: jersey.question,
        transcript: jersey.transcript,
        followUp: { kind: "clarify", asked: jersey.things[2].unclear!, transcript: "", thing: jersey.things[2] },
      },
      { preview: true, sample: "jersey-places" },
    );
    expect(clarified.headline).toBe("Try The Green Door, by the Grove Street PATH");
    expect(clarified.unclear).toBeUndefined();

    const nothing = await followUpThings(
      {
        question: jersey.question,
        transcript: jersey.transcript,
        followUp: { kind: "more", asked: "One more?", transcript: "", keep: jersey.things, want: 1 },
      },
      { preview: true, sample: "jersey-places" },
    );
    expect(nothing).toEqual([]);
  });
});
