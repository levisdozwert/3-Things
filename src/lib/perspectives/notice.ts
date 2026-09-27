import { stem } from "../library";
import type { PerspectivesRequest, RawTheme } from "./contract";

/**
 * What can be noticed across answers without an editor: only the plainest
 * connections. Two people named the same place, book or practice, or wrote
 * the same idea in nearly the same words. One of them would skip what the
 * other recommends. Nothing looser, because a false agreement is worse than
 * a missed one. Every angle is a sentence from the person's own answer.
 */

/** Words too common to connect two answers on their own. */
const COMMON = new Set(
  (
    "a an the and or but of to in on at for from with about into by as than then so if it its it's is are be was were " +
    "you your yours i i'm me my we our they them their this that these those there here what which who when where why how " +
    "not no don't dont do does did get got go going take make try see just really very more most less much many little lot " +
    "some any every all always never once first one two three thing things way time times day days good great nice people " +
    "person place places someone something sure also even still only can can't will would should could need want like " +
    "visit walk eat read save ask keep find stay put call hire ship build learn protect watch talk sit stop start spend " +
    "head catch grab order bring give let use look feel think know tell say"
  ).split(" "),
);

const CALENDAR = new Set(
  "monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december".split(
    " ",
  ),
);

/** Near a name, these say someone would rather not: "skip Navy Pier", "instead of the Bean". */
const AVOID_BEFORE = new Set(["skip", "skipping", "avoid", "don't", "dont", "never", "not", "pass", "overrated", "instead"]);
const AVOID_AFTER = new Set(["overrated", "isn't", "not", "skip"]);

const fold = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'");

function sentencesOf(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

function tokensOf(sentence: string): string[] {
  return sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'’&-]*/gu) ?? [];
}

const isCapitalized = (token: string) => /^\p{Lu}/u.test(token) && !/^I(?:['’]|$)/.test(token);

/** Names in a sentence: "Lou Malnati's", "Navy Pier", "the Art Institute". Not the sentence's first word alone. */
function namesIn(sentence: string, ignore: Set<string>): string[] {
  const tokens = tokensOf(sentence);
  const found: string[] = [];
  let run: string[] = [];
  let startsSentence = false;
  const flush = () => {
    let words = run;
    // "See Navy Pier": a sentence's first word is capitalized anyway; drop it when it's an ordinary word.
    if (startsSentence && words.length > 0 && COMMON.has(fold(words[0]))) words = words.slice(1);
    if (startsSentence && run.length === 1) words = [];
    while (words.length && ["of", "the", "and", "&"].includes(fold(words[words.length - 1]))) words = words.slice(0, -1);
    const meaningful = words.filter((w) => !ignore.has(fold(w).replace(/'s$/, "")) && !CALENDAR.has(fold(w)));
    if (words.length > 0 && meaningful.length > 0) found.push(words.join(" "));
    run = [];
  };
  tokens.forEach((token, i) => {
    const connector = run.length > 0 && ["of", "the", "&"].includes(fold(token)) && isCapitalized(tokens[i + 1] ?? "");
    if (isCapitalized(token) || connector) {
      if (run.length === 0) startsSentence = i === 0;
      run.push(token);
    } else if (run.length) flush();
  });
  if (run.length) flush();
  return found;
}

const wordsOf = (text: string) => tokensOf(text).map(fold);

function contains(text: string, phrase: string): boolean {
  return ` ${wordsOf(text).join(" ")} `.includes(` ${wordsOf(phrase).join(" ")} `);
}

/** True when the sentence mentioning it says to skip it. */
function avoids(sentence: string, phrase: string): boolean {
  const ws = wordsOf(sentence);
  const target = wordsOf(phrase);
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.some((t, j) => ws[i + j] !== t)) continue;
    const before = ws.slice(Math.max(0, i - 4), i);
    const after = ws.slice(i + target.length, i + target.length + 3);
    if (before.some((w) => AVOID_BEFORE.has(w)) || after.some((w) => AVOID_AFTER.has(w))) return true;
  }
  return false;
}

/** The words that carry a headline's meaning, as stems. */
function meaningOf(headline: string, ignore: Set<string>): Set<string> {
  return new Set(
    wordsOf(headline)
      .filter((w) => !COMMON.has(w) && !ignore.has(w) && w.length > 2)
      .map((w) => stem(w.replace(/'s$/, ""))),
  );
}

interface Item {
  answer: number;
  thing: number;
  headline: string;
  sentences: string[];
  details: string[];
  meaning: Set<string>;
}

/** Their own sentence about it: where they named it, or, when it's their headline, what they said next. */
function angleFor(item: Item, phrase?: string): string | undefined {
  const inDetail = phrase ? item.details.find((s) => contains(s, phrase)) : undefined;
  return (inDetail ?? item.details[0] ?? item.headline).replace(/[.]+$/, "");
}

export function noticeThemes({ question, answers }: PerspectivesRequest): RawTheme[] {
  // Words everyone shares because of the question ("Chicago") or who answered don't connect anyone.
  const ignore = new Set([...wordsOf(question), ...answers.flatMap((a) => wordsOf(a.person))]);
  const items: Item[] = answers.flatMap((a, answer) =>
    a.things.map((t, thing) => {
      const details = sentencesOf(t.detail);
      return { answer, thing, headline: t.headline, details, sentences: [t.headline, ...details], meaning: meaningOf(t.headline, ignore) };
    }),
  );
  const key = (i: Item) => `${i.answer}:${i.thing}`;
  const themes: RawTheme[] = [];
  const linked = new Map<string, RawTheme>();
  const taken = new Set<string>();

  // 1. The same name in two people's answers: the same thing, or a different take on it.
  const names = [...new Set(items.flatMap((i) => i.sentences.flatMap((s) => namesIn(s, ignore))))].sort(
    (a, b) => wordsOf(b).length - wordsOf(a).length,
  );
  const seenNames = new Set<string>();
  for (const name of names) {
    if (seenNames.has(fold(name))) continue;
    seenNames.add(fold(name));
    const hits = items.filter((i) => i.sentences.some((s) => contains(s, name)));
    if (new Set(hits.map((h) => h.answer)).size < 2) continue;
    const skips = hits.map((h) => h.sentences.some((s) => contains(s, name) && avoids(s, name)));
    const kind = skips.some(Boolean) && skips.some((s) => !s) ? "different" : "same";
    const members = kind === "different" ? hits.filter((h) => !taken.has(key(h))) : hits.filter((h) => !linked.has(key(h)));
    if (new Set(members.map((m) => m.answer)).size < 2) continue;
    const theme: RawTheme = {
      kind,
      label: name.replace(/^the\s+/i, "").replace(/^./, (c) => c.toUpperCase()),
      members: members.map((m) => ({ answer: m.answer, thing: m.thing, angle: angleFor(m, name) })),
    };
    themes.push(theme);
    for (const m of members) {
      if (kind === "different") taken.add(key(m));
      else linked.set(key(m), theme);
    }
  }

  // 2. The same idea in nearly the same words: at least two meaningful words in common.
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const x = items[a];
      const y = items[b];
      if (x.answer === y.answer) continue;
      const shared = [...x.meaning].filter((w) => y.meaning.has(w));
      if (shared.length < 2) continue;
      const home = linked.get(key(x)) ?? linked.get(key(y));
      if (home) {
        if (home.kind !== "same") continue;
        for (const item of [x, y]) {
          if (linked.has(key(item))) continue;
          home.members.push({ answer: item.answer, thing: item.thing, angle: angleFor(item) });
          linked.set(key(item), home);
        }
        continue;
      }
      const words = tokensOf(x.headline).filter((w) => shared.includes(stem(fold(w).replace(/'s$/, ""))));
      const theme: RawTheme = {
        kind: "same",
        label: words.join(" ").replace(/^./, (c) => c.toUpperCase()),
        members: [x, y].map((i) => ({ answer: i.answer, thing: i.thing, angle: angleFor(i) })),
      };
      themes.push(theme);
      linked.set(key(x), theme);
      linked.set(key(y), theme);
    }
  }
  return themes;
}
