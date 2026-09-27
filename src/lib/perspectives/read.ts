import { detectMode } from "../distill/client";
import type { Capture, Perspectives, PerspectiveTheme } from "../types";
import type { AnswerForReading, PerspectivesRequest, PerspectivesResponse, RawTheme } from "./contract";
import { basisOf } from "./basis";
import { groundThemes } from "./grounding";
import { noticeThemes } from "./notice";

export { basisOf };

/**
 * Reading answers side by side. With the editor connected, it reads them all
 * together; without it (static previews), only the plainest connections are
 * noticed on this device. Either way the result is grounded, stored on top of
 * the answers, and read again only when the answers change.
 */

export function forReading(question: string, answers: Capture[]): PerspectivesRequest {
  return {
    question,
    answers: answers.map(
      (c): AnswerForReading => ({
        person: c.person.trim() || "Someone",
        things: c.things.map((t) => ({ headline: t.headline, detail: t.detail, ...(t.said ? { said: t.said } : {}) })),
      }),
    ),
  };
}

/** From positions in the request to the conversations and things themselves. */
function stored(themes: RawTheme[], answers: Capture[]): PerspectiveTheme[] {
  return themes.map((t) => ({
    kind: t.kind,
    label: t.label,
    ...(t.note ? { note: t.note } : {}),
    members: t.members.map((m) => ({
      captureId: answers[m.answer].id,
      thingId: answers[m.answer].things[m.thing].id,
      ...(m.angle ? { angle: m.angle } : {}),
    })),
  }));
}

/** Only connections whose people and things are all still there. */
export function stillValid(themes: PerspectiveTheme[], answers: Capture[]): PerspectiveTheme[] {
  const things = new Map(answers.map((c) => [c.id, new Set(c.things.map((t) => t.id))]));
  return themes.flatMap((t) => {
    const members = t.members.filter((m) => things.get(m.captureId)?.has(m.thingId));
    return new Set(members.map((m) => m.captureId)).size >= 2 ? [{ ...t, members }] : [];
  });
}

/**
 * Adds what was just noticed to what was already known, without undoing it:
 * a new answer joins a connection it shares, or starts its own.
 */
export function mergeThemes(kept: PerspectiveTheme[], found: PerspectiveTheme[]): PerspectiveTheme[] {
  const out = kept.map((t) => ({ ...t, members: [...t.members] }));
  const key = (m: { captureId: string; thingId: string }) => `${m.captureId}:${m.thingId}`;
  const homes = { linked: new Map<string, PerspectiveTheme>(), takes: new Map<string, PerspectiveTheme>() };
  const index = (t: PerspectiveTheme) => t.members.forEach((m) => (t.kind === "different" ? homes.takes : homes.linked).set(key(m), t));
  out.forEach(index);

  for (const theme of found) {
    const map = theme.kind === "different" ? homes.takes : homes.linked;
    const home = theme.members.map((m) => map.get(key(m))).find(Boolean);
    if (!home) {
      out.push(theme);
      index(theme);
      continue;
    }
    for (const m of theme.members) {
      if (map.has(key(m))) continue;
      home.members.push(m);
      map.set(key(m), home);
    }
  }
  return out;
}

async function post(req: PerspectivesRequest): Promise<PerspectivesResponse> {
  const res = await fetch("/api/perspectives", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Perspectives failed with ${res.status}`);
  return (await res.json()) as PerspectivesResponse;
}

export async function readPerspectives(question: string, answers: Capture[], before?: Perspectives): Promise<Perspectives> {
  const req = forReading(question, answers);
  const basis = basisOf(answers);

  if ((await detectMode()) === "live") {
    try {
      const response = await post(req);
      return { basis, by: "editor", themes: stored(groundThemes(response.themes, req.answers, question), answers) };
    } catch {
      /* the editor is unreachable: notice what can be noticed here, below */
    }
  }

  const noticed = stored(groundThemes(noticeThemes(req), req.answers, question), answers);
  const kept = before ? stillValid(before.themes, answers) : [];
  return {
    basis,
    by: before?.by === "sample" || before?.by === "editor" ? before.by : "preview",
    themes: mergeThemes(kept, noticed),
  };
}
