import { describe, expect, it } from "vitest";
import { groundResponse, groundThing, isGrounded, isVerbatim, unsupportedTerms } from "../src/lib/distill/grounding";

const transcript =
  "Okay, Jersey City. First, walk the waterfront, but definitely around sunset. During the afternoon it's fine, but around sunset you get the Manhattan skyline. For food, I'd say the pizza place on Grove... actually, no, forget that. Razza is much better. Get the margherita, and go early. And that coffee place near the station... I can't remember the name... but it's really good.";
const sources = { transcript, question: "What are three places I shouldn't miss in Jersey City?", person: "Alex" };

const thing = (headline: string, quote: string, detail = "") => ({ headline, detail, quote });

describe("isGrounded", () => {
  it("accepts words the speaker actually said, ignoring punctuation and case", () => {
    expect(isGrounded("walk the waterfront", transcript)).toBe(true);
    expect(isGrounded("Razza is much better", transcript)).toBe(true);
  });

  it("tolerates a small speech-recognition slip", () => {
    expect(isGrounded("Get the margherita, and go erly", transcript)).toBe(true);
  });

  it("rejects words the speaker never said", () => {
    expect(isGrounded("take the ferry to the Statue of Liberty", transcript)).toBe(false);
    expect(isGrounded("", transcript)).toBe(false);
  });
});

describe("isVerbatim", () => {
  it("only accepts the exact words, in order", () => {
    expect(isVerbatim("Razza is much better.", transcript)).toBe(true);
    expect(isVerbatim("Razza is so much better", transcript)).toBe(false);
  });
});

describe("unsupportedTerms", () => {
  it("flags a name nobody said", () => {
    expect(unsupportedTerms("Try the pizza at Porta", sources)).toEqual(["Porta"]);
  });

  it("flags a number nobody said", () => {
    expect(unsupportedTerms("Get there by 6pm", sources)).toEqual(["6pm"]);
  });

  it("accepts names from the conversation, the question and the speaker", () => {
    expect(unsupportedTerms("Go to Razza for pizza", sources)).toEqual([]);
    expect(unsupportedTerms("The best walk in Jersey City", sources)).toEqual([]);
    expect(unsupportedTerms("Alex loves the Manhattan skyline at sunset", sources)).toEqual([]);
  });

  it("doesn't mistake the first word of a sentence for a name", () => {
    expect(unsupportedTerms("Walk the waterfront. Go early.", sources)).toEqual([]);
  });

  it("accepts a possessive name they said, and still flags one they didn't", () => {
    const said = { transcript: "Get the deep dish at Lou Malnati's, trust me." };
    expect(unsupportedTerms("Deep dish at Lou Malnati’s", said)).toEqual([]);
    expect(unsupportedTerms("Deep dish at Giordano's", said)).toEqual(["Giordano's"]);
  });
});

describe("groundThing", () => {
  it("drops a thing whose headline supplies a name the speaker couldn't remember", () => {
    const invented = thing("Try Modcup Coffee near the station", "that coffee place near the station");
    expect(groundThing(invented, sources)).toBeNull();
  });

  it("keeps the thing but removes a context sentence with an invented detail", () => {
    const result = groundThing(
      thing("Go to Razza for pizza", "Razza is much better", "Get the margherita, and go early. It opened in 2012 in the Grove area."),
      sources,
    );
    expect(result?.detail).toBe("Get the margherita, and go early.");
  });

  it("keeps a quote only when those exact words were said", () => {
    const exact = groundThing({ ...thing("Go to Razza for pizza", "Razza is much better"), said: "Razza is much better." }, sources);
    expect(exact?.said).toBe("Razza is much better.");
    const polished = groundThing({ ...thing("Go to Razza for pizza", "Razza is much better"), said: "Razza is simply the best." }, sources);
    expect(polished?.said).toBeUndefined();
  });

  it("keeps an honest clarification question", () => {
    const result = groundThing(
      { ...thing("Try the coffee place near the station", "that coffee place near the station"), unclear: "Which coffee place did you mean" },
      sources,
    );
    expect(result?.unclear).toBe("Which coffee place did you mean?");
  });

  it("keeps context to three sentences", () => {
    const result = groundThing(
      thing("Walk the waterfront around sunset", "walk the waterfront", "One. Two. Three. Four."),
      sources,
    );
    expect(result?.detail).toBe("One. Two. Three.");
  });
});

describe("groundResponse", () => {
  it("never returns more than three things, and never pads to three", () => {
    const four = groundResponse(
      {
        things: [
          thing("Walk the waterfront", "walk the waterfront"),
          thing("Go around sunset", "around sunset"),
          thing("Go to Razza", "Razza is much better"),
          thing("Get the margherita", "Get the margherita"),
        ],
        topic: "Travel",
        answered: true,
      },
      sources,
    );
    expect(four.things).toHaveLength(3);

    const one = groundResponse({ things: [thing("Walk the waterfront", "walk the waterfront")], topic: "Travel", answered: true }, sources);
    expect(one.things).toHaveLength(1);
  });

  it("drops anything that can't be traced back to the conversation", () => {
    const result = groundResponse(
      {
        things: [thing("Walk the waterfront", "walk the waterfront"), thing("Take the ferry", "the ferry is great")],
        topic: "Travel",
        answered: true,
      },
      sources,
    );
    expect(result.things.map((t) => t.headline)).toEqual(["Walk the waterfront"]);
  });

  it("keeps a grounded fourth idea aside, never as a fourth thing", () => {
    const result = groundResponse(
      {
        things: [thing("Walk the waterfront", "walk the waterfront")],
        extra: thing("Get the margherita", "Get the margherita"),
        topic: "Travel",
        answered: true,
      },
      sources,
    );
    expect(result.things).toHaveLength(1);
    expect(result.extra?.headline).toBe("Get the margherita");
  });

  it("keeps a place only when it was actually named", () => {
    const named = groundResponse({ things: [thing("Walk the waterfront", "walk the waterfront")], topic: "Travel", place: "Jersey City", answered: true }, sources);
    expect(named.place).toBe("Jersey City");
    const guessed = groundResponse({ things: [thing("Walk the waterfront", "walk the waterfront")], topic: "Travel", place: "Hoboken", answered: true }, sources);
    expect(guessed.place).toBeUndefined();
  });

  it("tidies headlines and removes duplicates", () => {
    const result = groundResponse(
      {
        things: [thing("walk the waterfront.", "walk the waterfront"), thing("Walk the waterfront", "walk the waterfront")],
        topic: "",
        answered: true,
      },
      sources,
    );
    expect(result.things.map((t) => t.headline)).toEqual(["Walk the waterfront"]);
    expect(result.topic).toBe("Life");
  });

  it("is not answered when nothing survives", () => {
    const result = groundResponse({ things: [thing("Invented", "never said")], topic: "Travel", answered: true }, sources);
    expect(result.answered).toBe(false);
    expect(result.things).toEqual([]);
  });
});
