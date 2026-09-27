import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiHandler } from "../server/api";
import type { AnswerPayload } from "../src/lib/remote/contract";
import { memoryStorage, RelayCore } from "../src/lib/remote/core";

const question = {
  question: "What are three places I shouldn't miss in Chicago?",
  askerName: "Levis",
  forName: "Sarah",
  wantsAudio: false,
};

const answer: AnswerPayload = {
  name: "",
  things: [
    { headline: "The Art Institute", detail: "Go on a weekday morning." },
    { headline: "The architecture boat tour", detail: "" },
  ],
  topic: "Travel",
  place: "Chicago",
  durationSec: 64,
};

describe("the relay", () => {
  it("shows the question to whoever has the link, and marks it opened", () => {
    const relay = new RelayCore(memoryStorage());
    const { id, ownerKey } = relay.create(question);
    expect(relay.status([{ id, ownerKey }])[0].state).toBe("sent");
    // The asker previewing it doesn't count as Sarah opening it.
    expect(relay.view(id, { peek: true })?.question).toBe(question.question);
    expect(relay.status([{ id, ownerKey }])[0].state).toBe("sent");
    expect(relay.view(id)).toMatchObject({ askerName: "Levis", forName: "Sarah", answered: false });
    expect(relay.status([{ id, ownerKey }])[0].state).toBe("opened");
  });

  it("gives answers only to the asker's key", () => {
    const relay = new RelayCore(memoryStorage());
    const { id, ownerKey } = relay.create(question);
    expect(relay.answer(id, answer)).toBe("sent");
    expect(relay.status([{ id, ownerKey: "guess" }])).toEqual([]);
    const [status] = relay.status([{ id, ownerKey }]);
    expect(status.state).toBe("answered");
    expect(status.answers[0].things.map((t) => t.headline)).toEqual(["The Art Institute", "The architecture boat tour"]);
  });

  it("takes one answer when sent to someone, and many when it's for anyone", () => {
    const relay = new RelayCore(memoryStorage());
    const sarah = relay.create(question);
    relay.answer(sarah.id, answer);
    expect(relay.answer(sarah.id, answer)).toBe("closed");
    expect(relay.view(sarah.id)?.answered).toBe(true);

    const anyone = relay.create({ ...question, forName: "" });
    relay.answer(anyone.id, { ...answer, name: "Sarah" });
    relay.answer(anyone.id, { ...answer, name: "Tom" });
    const [status] = relay.status([anyone]);
    // Each answer stays separate, in the order they came.
    expect(status.answers.map((a) => a.name)).toEqual(["Sarah", "Tom"]);
  });

  it("forgets what was said once the asker's app has it", () => {
    const relay = new RelayCore(memoryStorage());
    const { id, ownerKey } = relay.create(question);
    relay.answer(id, answer);
    const [status] = relay.status([{ id, ownerKey }]);
    relay.collect(id, ownerKey, status.answers.map((a) => a.id));
    expect(relay.status([{ id, ownerKey }])[0]).toEqual({ id, state: "answered", answers: [] });
  });

  it("never passes on a recording unless the asker keeps them and the person allowed it", () => {
    const relay = new RelayCore(memoryStorage());
    const withAudio = { ...answer, audio: ["data:audio/webm;base64,AAAA"] };
    const noKeeping = relay.create(question);
    relay.answer(noKeeping.id, withAudio);
    expect(relay.status([noKeeping])[0].answers[0].audio).toBeUndefined();

    const keeping = relay.create({ ...question, wantsAudio: true });
    relay.answer(keeping.id, withAudio);
    expect(relay.status([keeping])[0].answers[0].audio).toEqual(["data:audio/webm;base64,AAAA"]);
  });

  it("says a deleted question is gone", () => {
    const relay = new RelayCore(memoryStorage());
    const { id, ownerKey } = relay.create(question);
    expect(relay.remove(id, "guess")).toBe(false);
    expect(relay.remove(id, ownerKey)).toBe(true);
    expect(relay.view(id)).toBeNull();
    expect(relay.answer(id, answer)).toBe("gone");
    expect(relay.status([{ id, ownerKey }])[0].state).toBe("gone");
  });

  it("refuses answers that aren't one to three reviewed things", () => {
    const relay = new RelayCore(memoryStorage());
    const { id } = relay.create(question);
    expect(relay.answer(id, { ...answer, things: [] })).toBe("invalid");
    expect(relay.answer(id, { ...answer, things: [...answer.things, ...answer.things] })).toBe("invalid");
  });
});

describe("the relay over HTTP", () => {
  let server: Server;
  let base = "";

  beforeAll(async () => {
    const handler = createApiHandler({});
    server = createServer((req, res) => void handler(req, res, () => res.end()));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("goes from question to collected answer", async () => {
    const json = { "content-type": "application/json" };
    const health = await (await fetch(`${base}/api/health`)).json();
    expect(health.relay).toBe(true);

    const created = await fetch(`${base}/api/remote`, { method: "POST", headers: json, body: JSON.stringify(question) });
    expect(created.status).toBe(201);
    const { id, ownerKey } = await created.json();

    const opened = await fetch(`${base}/api/remote/${id}`);
    expect(opened.headers.get("x-robots-tag")).toContain("noindex");
    expect((await opened.json()).question).toBe(question.question);

    const sent = await fetch(`${base}/api/remote/${id}/answer`, { method: "POST", headers: json, body: JSON.stringify(answer) });
    expect(sent.status).toBe(201);

    const status = await (
      await fetch(`${base}/api/remote/status`, { method: "POST", headers: json, body: JSON.stringify({ items: [{ id, ownerKey }] }) })
    ).json();
    expect(status[0].answers).toHaveLength(1);

    await fetch(`${base}/api/remote/${id}/delete`, { method: "POST", headers: json, body: JSON.stringify({ ownerKey }) });
    expect((await fetch(`${base}/api/remote/${id}`)).status).toBe(410);
  });
});
