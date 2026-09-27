import { describe, expect, it } from "vitest";
import { closestSample } from "../src/lib/distill/client";
import { reconcile } from "../src/lib/people";
import type { PerspectivesRequest, RawTheme } from "../src/lib/perspectives/contract";
import { groundThemes } from "../src/lib/perspectives/grounding";
import { noticeThemes } from "../src/lib/perspectives/notice";
import { basisOf, forReading, mergeThemes, readPerspectives, stillValid } from "../src/lib/perspectives/read";
import { answeredLine, askedLine, findQuestion, listQuestions } from "../src/lib/questions";
import { describeArrivals } from "../src/lib/remote/arrivals";
import { receive } from "../src/lib/remote/receive";
import { sampleConversations, sampleNotes, sampleOutgoing, samplePerspectives, seedCaptures } from "../src/lib/samples";
import type { Capture, Perspectives } from "../src/lib/types";

const now = new Date("2026-09-27T20:00:00");
const { captures: library, people } = reconcile(seedCaptures(now), [], sampleNotes, now);
const outgoing = sampleOutgoing(now);
const chicago = findQuestion("sample-q-chicago", library, outgoing, people)!;
const founders = findQuestion("sample-q-founders", library, outgoing, people)!;
const at25 = findQuestion("sample-q-at25", library, outgoing, people)!;

/** A sample conversation as it would come back from someone: its own conversation in the group. */
function answerFrom(key: string, group: string, at: string): Capture {
  const convo = sampleConversations.find((c) => c.key === key)!;
  return {
    id: `answer-${key}`,
    question: convo.question,
    person: convo.person || "Maya",
    personIds: [],
    topic: convo.topic,
    things: convo.things.map((t, i) => ({ id: `answer-${key}-${i}`, headline: t.headline, detail: t.detail, ...(t.said ? { said: t.said } : {}) })),
    recordedAt: at,
    durationSec: convo.durationSec,
    hasAudio: false,
    origin: "recording",
    group,
  };
}

const asRaw = (reading: Perspectives, answers: Capture[]): RawTheme[] =>
  reading.themes.map((t) => ({
    kind: t.kind,
    label: t.label,
    ...(t.note ? { note: t.note } : {}),
    members: t.members.map((m) => {
      const answer = answers.findIndex((c) => c.id === m.captureId);
      return { answer, thing: answers[answer].things.findIndex((x) => x.id === m.thingId), ...(m.angle ? { angle: m.angle } : {}) };
    }),
  }));

describe("a question asked of several people", () => {
  it("keeps who was asked in the order they were asked, and answers in the order they came", () => {
    expect(askedLine(chicago)).toBe("Asked 4 people");
    expect(answeredLine(chicago)).toBe("2 of 4 answered");
    expect(chicago.asked.map((a) => [a.name, a.state])).toEqual([
      ["Sarah", "answered"],
      ["Jason", "answered"],
      ["Maya", "sent"],
      ["Daniel", "opened"],
    ]);
    expect(chicago.answers.map((c) => c.person)).toEqual(["Sarah", "Jason"]);
    expect(chicago.things).toBe(6);
  });

  it("brings in-person conversations and answers by link together, over months", () => {
    expect(founders.asked.map((a) => [a.name, a.how])).toEqual([
      ["Jason", "in person"],
      ["Maya", "link"],
      ["Carlos", "in person"],
    ]);
    expect(answeredLine(founders)).toBe("All 3 answered");
    expect(at25.answers.map((c) => c.person)).toEqual(["Dad", "Mom", "Priya", "Professor Reyes"]);
    expect(new Date(at25.firstAsked).getTime()).toBeLessThan(new Date(at25.latest).getTime() - 100 * 86_400_000);
  });

  it("leaves a question asked once as a single conversation", () => {
    const boston = listQuestions(library, outgoing, people).find((q) => q.question.includes("Boston") && q.answers[0]?.person === "Sarah");
    expect(boston?.answers).toHaveLength(1);
    expect(boston?.people).toBe(1);
  });

  it("files an answer that comes back under the question it answers", () => {
    const toMaya = outgoing.find((o) => o.id === "sample-ask-chicago-maya")!;
    const { captures } = receive(
      toMaya,
      [{ id: "m1", answeredAt: now.toISOString(), name: "", topic: "Travel", durationSec: 40, things: [{ headline: "The Bean", detail: "" }] }],
      people,
      now,
    );
    expect(captures[0].group).toBe("sample-q-chicago");
  });
});

describe("grounding what connects answers", () => {
  const req = forReading(founders.question, founders.answers);

  it("keeps every sample connection exactly as written", () => {
    for (const [group, reading] of Object.entries(samplePerspectives(now))) {
      const q = findQuestion(group, library, outgoing, people)!;
      expect(reading.basis).toBe(basisOf(q.answers));
      const raw = asRaw(reading, q.answers);
      expect(groundThemes(raw, forReading(q.question, q.answers).answers, q.question)).toEqual(raw);
    }
  });

  it("needs two different people, and real things", () => {
    expect(groundThemes([{ kind: "same", label: "Hiring", members: [{ answer: 0, thing: 0 }, { answer: 0, thing: 1 }] }], req.answers, req.question)).toEqual([]);
    expect(groundThemes([{ kind: "same", label: "Hiring", members: [{ answer: 0, thing: 0 }, { answer: 7, thing: 0 }] }], req.answers, req.question)).toEqual([]);
  });

  it("never judges, never names what nobody said, never guesses pronouns", () => {
    const [jason, carlos] = [0, 1];
    const theme = (label: string, note?: string, angle?: string): RawTheme => ({
      kind: "related",
      label,
      ...(note ? { note } : {}),
      members: [
        { answer: jason, thing: 0, ...(angle ? { angle } : {}) },
        { answer: carlos, thing: 0 },
      ],
    });
    expect(groundThemes([theme("The best advice")], req.answers, req.question)).toEqual([]);
    expect(groundThemes([theme("Hiring like Stripe")], req.answers, req.question)).toEqual([]);
    const [kept] = groundThemes([theme("People first", "Jason is right about this.", "his early hires set the culture")], req.answers, req.question);
    expect(kept.label).toBe("People first");
    expect(kept.note).toBeUndefined();
    expect(kept.members[0].angle).toBeUndefined();
  });

  it("never resolves a different take", () => {
    const [take] = groundThemes(
      [{ kind: "different", label: "Before you build", note: "Both approaches can work.", members: [{ answer: 0, thing: 2 }, { answer: 2, thing: 0 }] }],
      req.answers,
      req.question,
    );
    expect(take.note).toBeUndefined();
  });

  it("puts each thing in at most one connection", () => {
    const themes = groundThemes(
      [
        { kind: "related", label: "Money", members: [{ answer: 0, thing: 1 }, { answer: 1, thing: 2 }] },
        { kind: "related", label: "Spending", members: [{ answer: 0, thing: 1 }, { answer: 2, thing: 2 }] },
      ],
      req.answers,
      req.question,
    );
    expect(themes).toHaveLength(1);
  });
});

describe("noticing without an editor", () => {
  const request = (answers: Capture[]): PerspectivesRequest => forReading(chicago.question, answers);

  it("sees the same place, and a different take on another", () => {
    const themes = groundThemes(noticeThemes(request(chicago.answers)), request(chicago.answers).answers, chicago.question);
    expect(themes.map((t) => [t.kind, t.label])).toEqual([
      ["same", "Lou Malnati's"],
      ["different", "Navy Pier"],
    ]);
    const pier = themes.find((t) => t.label === "Navy Pier")!;
    // Each side in their own words.
    expect(pier.members.map((m) => m.angle)).toEqual([
      "If you're short on time, skip Navy Pier and walk the trail instead",
      "It's touristy, but first-time visitors should experience it once",
    ]);
  });

  it("connects a new answer that names the same thing, and nothing looser", () => {
    const maya = answerFrom("chicago", "sample-q-chicago", "2026-09-27T19:00:00");
    const daniel = answerFrom("chicago-daniel", "sample-q-chicago", "2026-09-27T19:30:00");
    const answers = [...chicago.answers, maya, daniel];
    const labels = groundThemes(noticeThemes(request(answers)), request(answers).answers, chicago.question).map((t) => t.label);
    expect(labels).toEqual(expect.arrayContaining(["Lou Malnati's", "Navy Pier", "Lakefront Trail", "Architecture boat tour"]));
    // "Chicago" is in everyone's answer because it's in the question; it connects nobody.
    expect(labels).not.toContain("Chicago");
  });

  it("doesn't pretend two ideas about hiring are the same idea", () => {
    const req = forReading(founders.question, founders.answers);
    expect(groundThemes(noticeThemes(req), req.answers, req.question)).toEqual([]);
  });

  it("adds to what was already read, without undoing it", async () => {
    const maya = answerFrom("chicago", "sample-q-chicago", "2026-09-27T19:00:00");
    const before = samplePerspectives(now)["sample-q-chicago"];
    const reading = await readPerspectives(chicago.question, [...chicago.answers, maya], before);
    expect(reading.by).toBe("sample");
    expect(reading.themes.map((t) => t.label)).toEqual(["Lou Malnati's", "Navy Pier", "Architecture boat tour"]);
    // The sample's own words for why each of them goes stay as they were.
    expect(reading.themes[0].members.map((m) => m.angle)).toEqual(["Goes for the pizza itself", "Takes every single visitor there"]);
    expect(stillValid(reading.themes, chicago.answers)).toHaveLength(2);
    expect(mergeThemes(before.themes, [])).toEqual(before.themes);
  });
});

describe("previews answer as whoever was asked", () => {
  it("gives each person their own answer, or one that belongs to nobody", () => {
    const q = "What are three things I shouldn't miss in Chicago?";
    expect(closestSample(q, "Daniel").key).toBe("chicago-daniel");
    expect(closestSample(q, "Sarah").key).toBe("chicago-sarah");
    expect(closestSample(q, "Maya").key).toBe("chicago");
    expect(closestSample("What are three places I shouldn't miss in Boston?", "Jason").key).toBe("boston");
    expect(closestSample("What are three things first-time founders should know?", "Sarah").key).toBe("founder-know");
  });
});

describe("when answers arrive", () => {
  const arrival = { captureId: "c1", name: "Maya", question: "What are three things I shouldn't miss in Chicago?", group: "g", place: "Chicago" };

  it("says someone answered when they're the first", () => {
    const notice = describeArrivals([arrival], () => 0);
    expect(notice.title).toBe("Maya answered your question");
    expect(notice.to).toBe("/library/c1");
  });

  it("says how many perspectives there are now, once, however many arrived", () => {
    expect(describeArrivals([arrival], () => 2)).toMatchObject({
      title: "Maya sent their 3",
      line: "You now have 3 perspectives on your Chicago question",
      to: "/library/questions/g",
    });
    const two = describeArrivals([{ ...arrival, name: "Daniel", captureId: "c0" }, arrival], () => 2);
    expect(two.title).toBe("Daniel and Maya answered");
    expect(two.line).toBe("You now have 4 perspectives on your Chicago question");
  });
});
