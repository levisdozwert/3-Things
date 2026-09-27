import { describe, expect, it } from "vitest";
import { closestSample } from "../src/lib/distill/client";
import { groundResponse, isGrounded } from "../src/lib/distill/grounding";
import { sampleConversations, seedCaptures } from "../src/lib/samples";

describe("sample conversations", () => {
  it.each(sampleConversations.map((c) => [c.key, c] as const))("%s: every thing comes from the transcript", (_, convo) => {
    expect(convo.things.length).toBeGreaterThan(0);
    expect(convo.things.length).toBeLessThanOrEqual(3);
    for (const thing of convo.things) {
      expect(isGrounded(thing.quote, convo.transcript), thing.quote).toBe(true);
    }
    const grounded = groundResponse({ things: convo.things, topic: convo.topic, answered: true }, convo.transcript);
    expect(grounded.things).toHaveLength(convo.things.length);
  });

  it("keeps a sample where the speaker only had two things", () => {
    const books = sampleConversations.find((c) => c.key === "books")!;
    expect(books.things).toHaveLength(2);
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
  it("matches the home screen's example questions exactly", () => {
    expect(closestSample("What are three things life has taught you?").key).toBe("life-taught");
    expect(closestSample("What are three things you wish you knew earlier?").key).toBe("wish-knew-earlier");
  });

  it("matches the Ask screen's example questions", () => {
    expect(closestSample("What are three things every first-time founder should know?").key).toBe("founders");
    expect(closestSample("What are three places I shouldn’t miss in Jersey City?").key).toBe("jersey-city");
    expect(closestSample("What are three places I shouldn't miss in Boston?").key).toBe("boston");
  });

  it("matches by the words in a typed question", () => {
    expect(closestSample("What are three places I should visit here?").key).toBe("jersey-city");
    expect(closestSample("Three books everyone should read?").key).toBe("books");
    expect(closestSample("What should I know about the weather?").key).toBe("learn-from-you");
  });
});
