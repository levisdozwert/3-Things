import { describe, expect, it } from "vitest";
import { groundResponse, isGrounded } from "../src/lib/distill/grounding";

const transcript =
  "Okay, Jersey City. Um, so first, honestly, walk the waterfront. Like around sunset, if you can. " +
  "Newark Avenue. There's a stretch there with a ton of independent places. Oh, and Liberty State Park.";

describe("isGrounded", () => {
  it("accepts words the speaker actually said, ignoring punctuation and case", () => {
    expect(isGrounded("walk the waterfront", transcript)).toBe(true);
    expect(isGrounded("There’s a stretch there with a ton of independent places", transcript)).toBe(true);
  });

  it("tolerates a small speech-recognition slip", () => {
    expect(isGrounded("a stretch there with a ton of independant places", transcript)).toBe(true);
  });

  it("rejects words the speaker never said", () => {
    expect(isGrounded("visit the Statue of Liberty ferry", transcript)).toBe(false);
    expect(isGrounded("", transcript)).toBe(false);
  });
});

describe("groundResponse", () => {
  const thing = (headline: string, quote: string) => ({ headline, detail: "", quote });

  it("drops anything that can't be traced back to the transcript", () => {
    const result = groundResponse(
      {
        things: [
          thing("Walk the waterfront around sunset", "walk the waterfront"),
          thing("Take the ferry to the Statue of Liberty", "the ferry is great"),
          thing("Spend time in Liberty State Park", "Liberty State Park"),
        ],
        topic: "Travel",
        answered: true,
      },
      transcript,
    );
    expect(result.things.map((t) => t.headline)).toEqual([
      "Walk the waterfront around sunset",
      "Spend time in Liberty State Park",
    ]);
  });

  it("never returns more than three things, and never pads to three", () => {
    const four = groundResponse(
      {
        things: [
          thing("One", "walk the waterfront"),
          thing("Two", "around sunset"),
          thing("Three", "Newark Avenue"),
          thing("Four", "Liberty State Park"),
        ],
        topic: "Travel",
        answered: true,
      },
      transcript,
    );
    expect(four.things).toHaveLength(3);

    const one = groundResponse({ things: [thing("One", "walk the waterfront")], topic: "Travel", answered: true }, transcript);
    expect(one.things).toHaveLength(1);
  });

  it("tidies headlines and removes duplicates", () => {
    const result = groundResponse(
      {
        things: [thing("walk the waterfront.", "walk the waterfront"), thing("Walk the waterfront", "walk the waterfront")],
        topic: "",
        answered: true,
      },
      transcript,
    );
    expect(result.things).toEqual([{ headline: "Walk the waterfront", detail: "", quote: "walk the waterfront" }]);
    expect(result.topic).toBe("Life");
  });

  it("is not answered when nothing survives", () => {
    const result = groundResponse({ things: [thing("Invented", "never said")], topic: "Travel", answered: true }, transcript);
    expect(result.answered).toBe(false);
    expect(result.things).toEqual([]);
  });
});
