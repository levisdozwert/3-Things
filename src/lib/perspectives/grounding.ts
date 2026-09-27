import { unsupportedTerms, type Sources } from "../distill/grounding";
import { PERSPECTIVE_LIMITS, type AnswerForReading, type RawTheme } from "./contract";

/**
 * If the app says two people connect, it can show you exactly where.
 *
 * These checks sit between whatever noticed the connections and the user.
 * They never add or rewrite anything; they only keep, trim or drop:
 *
 * - every connection points at real things from at least two different answers
 * - a thing joins at most one connection, and at most one different take
 * - labels, notes and angles may not name anything nobody said
 * - nothing judges: no best, right, wrong or winner that the people themselves
 *   didn't say, no analytical jargon, and nobody's pronouns are guessed
 * - a different take is never resolved: it carries no note at all
 */

const JUDGING = [
  "best", "top", "winner", "winning", "correct", "incorrect", "right", "wrong", "better", "worse", "worst",
  "smartest", "wisest", "credible", "trustworthy", "reliable", "consensus", "truth", "true", "objectively",
  "obviously", "popular", "majority", "superior", "ranked", "ranking",
];
const ANALYTICAL = ["cluster", "clustering", "similarity", "sentiment", "score", "scores", "confidence", "semantic", "match", "matches"];
const PRONOUNS = ["he", "she", "him", "his", "her", "hers", "himself", "herself"];

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .match(/[\p{L}\p{N}']+/gu) ?? [];
}

const tidy = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

export function thingText(thing: AnswerForReading["things"][number]): string {
  return `${thing.headline}. ${thing.detail} ${thing.said ?? ""}`.trim();
}

/**
 * True when the text says nothing the sources don't support: no new names or
 * numbers, no judging words they didn't use themselves, no jargon, no guessed pronouns.
 */
export function speaksFairly(text: string, sources: Sources): boolean {
  const said = new Set(words(`${sources.transcript} ${sources.question ?? ""}`));
  const ws = words(text);
  if (ws.some((w) => JUDGING.includes(w) && !said.has(w))) return false;
  if (ws.some((w) => ANALYTICAL.includes(w) || PRONOUNS.includes(w))) return false;
  return unsupportedTerms(text, sources).length === 0;
}

function firstSentence(text: string): string {
  return tidy(text).match(/^[^.!?]+[.!?]?/)?.[0].trim() ?? "";
}

function asLabel(text: string): string {
  const clean = tidy(text).replace(/[.。]+$/, "").replace(/^["“]|["”]$/g, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const key = (m: { answer: number; thing: number }) => `${m.answer}:${m.thing}`;

/**
 * Normalizes connections noticed across answers and removes anything that
 * can't be traced back to them. Never adds; only keeps, trims or drops.
 */
export function groundThemes(themes: RawTheme[] | undefined, answers: AnswerForReading[], question: string): RawTheme[] {
  const linked = new Set<string>();
  const takes = new Set<string>();
  const out: RawTheme[] = [];
  let connections = 0;
  let different = 0;

  for (const theme of themes ?? []) {
    if (!theme || !["same", "related", "different"].includes(theme.kind)) continue;
    const isTake = theme.kind === "different";
    if (isTake ? different >= PERSPECTIVE_LIMITS.takes : connections >= PERSPECTIVE_LIMITS.connections) continue;
    const used = isTake ? takes : linked;

    const seen = new Set<string>();
    const members: RawTheme["members"] = [];
    for (const m of theme.members ?? []) {
      const answer = answers[m?.answer];
      const thing = answer?.things[m?.thing];
      if (!Number.isInteger(m.answer) || !Number.isInteger(m.thing) || !thing) continue;
      if (seen.has(key(m)) || used.has(key(m))) continue;
      seen.add(key(m));
      const angle = tidy(m.angle).replace(/[.]+$/, "");
      const own: Sources = { transcript: thingText(thing), question, person: answer.person };
      const angleOk = angle && words(angle).length <= PERSPECTIVE_LIMITS.angleWords && speaksFairly(angle, own);
      members.push({ answer: m.answer, thing: m.thing, ...(angleOk ? { angle } : {}) });
    }
    if (new Set(members.map((m) => m.answer)).size < 2) continue;

    const all: Sources = {
      transcript: members.map((m) => thingText(answers[m.answer].things[m.thing])).join(" "),
      question,
      person: members.map((m) => answers[m.answer].person).join(" "),
    };

    let label = asLabel(theme.label ?? "");
    if (!label || words(label).length > PERSPECTIVE_LIMITS.labelWords || !speaksFairly(label, all)) {
      // A connection nobody can name plainly isn't shown. The same thing can simply be named as its first person said it.
      if (theme.kind !== "same") continue;
      label = answers[members[0].answer].things[members[0].thing].headline;
    }

    const note = isTake ? "" : firstSentence(theme.note ?? "");
    const noteOk = note && words(note).length <= PERSPECTIVE_LIMITS.noteWords && speaksFairly(note, all);

    members.forEach((m) => used.add(key(m)));
    if (isTake) different += 1;
    else connections += 1;
    out.push({ kind: theme.kind, label, ...(noteOk ? { note } : {}), members });
  }
  return out;
}
