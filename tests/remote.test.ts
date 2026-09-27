import { describe, expect, it } from "vitest";
import { listPeople } from "../src/lib/library";
import { reconcile } from "../src/lib/people";
import type { ReceivedAnswer } from "../src/lib/remote/contract";
import { inviteText } from "../src/lib/remote/invite";
import { captureIdFor, receive } from "../src/lib/remote/receive";
import { sampleNotes, sampleOutgoing, seedCaptures } from "../src/lib/samples";
import { defaultSettings, refreshSamples } from "../src/lib/store";
import type { Outgoing } from "../src/lib/types";

const now = new Date("2026-09-27T20:00:00");
const { people } = reconcile(seedCaptures(now), [], sampleNotes, now);
const sarah = people.find((p) => p.name === "Sarah")!;

const chicago: Outgoing = {
  id: "q1",
  ownerKey: "k",
  via: "local",
  question: "What are three places I shouldn't miss in Chicago?",
  speakers: [{ id: sarah.id }],
  person: "Sarah",
  group: "g1",
  sentAt: "2026-09-25T18:00:00.000Z",
  state: "opened",
  answers: [],
  wantsAudio: false,
};

const answer = (id: string, name = "", headlines = ["The architecture boat tour", "The Art Institute"]): ReceivedAnswer => ({
  id,
  answeredAt: "2026-09-27T09:00:00.000Z",
  name,
  things: headlines.map((headline) => ({ headline, detail: "" })),
  topic: "Travel",
  place: "Chicago",
  durationSec: 71.4,
});

describe("answers coming back", () => {
  it("becomes an ordinary conversation, from the person it was sent to", () => {
    const { captures } = receive(chicago, [answer("a1")], people, now);
    expect(captures).toHaveLength(1);
    const [c] = captures;
    expect(c.id).toBe(captureIdFor(answer("a1")));
    expect(c.person).toBe("Sarah");
    expect(c.personIds).toEqual([sarah.id]);
    expect(c.things.map((t) => t.headline)).toEqual(["The architecture boat tour", "The Art Institute"]);
    // Two things came back: nothing was added to make three.
    expect(c.things).toHaveLength(2);
    expect(c.remote).toEqual({ sentAt: chicago.sentAt, answeredAt: "2026-09-27T09:00:00.000Z" });
    expect(c.unseen).toBe(true);
    expect(c.place).toBe("Chicago");
  });

  it("makes someone new a person only once they've answered", () => {
    const toPriya: Outgoing = { ...chicago, speakers: [{ name: "Priya" }], person: "Priya" };
    const { captures, people: after, speakers } = receive(toPriya, [answer("a2")], people, now);
    const priya = after.find((p) => p.name === "Priya");
    expect(priya).toBeDefined();
    expect(captures[0].personIds).toEqual([priya!.id]);
    expect(speakers).toEqual([{ id: priya!.id }]);
    expect(people.some((p) => p.name === "Priya")).toBe(false);
  });

  it("keeps each answer to a link for anyone separate, under the name they gave", () => {
    const anyone: Outgoing = { ...chicago, speakers: [], person: "" };
    const { captures, people: after } = receive(
      anyone,
      [answer("a3", "Sarah", ["Deep dish is overrated"]), answer("a4", "Tom", ["Deep dish, obviously"])],
      people,
      now,
    );
    expect(captures.map((c) => c.person)).toEqual(["Sarah", "Tom"]);
    // Different people can disagree. Nobody's answer is merged into anyone else's.
    expect(captures.map((c) => c.things[0].headline)).toEqual(["Deep dish is overrated", "Deep dish, obviously"]);
    // A name alone never assumes they're the Sarah you already know.
    expect(captures[0].personIds).not.toEqual([sarah.id]);
    expect(listPeople(captures, after).map((p) => p.name).sort()).toEqual(["Sarah", "Tom"]);
  });
});

describe("sending", () => {
  it("asks warmly, and reminds gently", () => {
    expect(inviteText({ asker: "Levis", question: "What are three books you love?" })).toBe(
      "Levis would love your 3 Things: “What are three books you love?” Answer by voice, whenever suits you:",
    );
    expect(inviteText({ asker: "Levis", question: "Q?", reminder: true })).toMatch(/^A gentle reminder from Levis/);
  });

  it("offers the sample questions still waiting, once", () => {
    const waiting = sampleOutgoing(now);
    expect(waiting.map((o) => [o.person, o.state])).toEqual([
      ["Jason", "opened"],
      ["Mom", "sent"],
    ]);
    const first = refreshSamples({ captures: [], people: [], settings: defaultSettings });
    expect(first.outgoing?.filter((o) => o.sample)).toHaveLength(2);
    // Deleted by the user: not offered again.
    const again = refreshSamples({ ...first, outgoing: [] });
    expect(again.outgoing).toEqual([]);
  });

  it("has one answer that just arrived, not opened yet", () => {
    const arrived = seedCaptures(now).filter((c) => c.unseen);
    expect(arrived.map((c) => c.person)).toEqual(["Maya"]);
    expect(arrived[0].remote).toBeDefined();
  });
});
