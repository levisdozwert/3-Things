import { MAX_THINGS, type DistillResponse, type DistilledThing } from "./contract";

/**
 * If the app says someone said it, they actually said it.
 *
 * These checks sit between the editor model and the user. They never add or
 * rewrite anything; they only keep, trim or drop:
 *
 * - a thing must be based on words that appear in the conversation
 * - a headline may not name a person, place, product or number the speaker
 *   never said; a context sentence that does is removed
 * - a quote is shown only if the speaker said exactly those words
 */

export interface Sources {
  /** Everything said in the conversation. */
  transcript: string;
  /** The question, whose words the answer may reuse ("in Jersey City"). */
  question?: string;
  /** The speaker's name, which the context may use ("Jason learned…"). */
  person?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'");
}

function words(text: string): string[] {
  return normalize(text)
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

/** True when the words appear in the transcript, allowing for small speech-recognition slips. */
export function isGrounded(quote: string, transcript: string): boolean {
  const q = words(quote);
  if (q.length === 0) return false;
  const t = words(transcript);
  if (` ${t.join(" ")} `.includes(` ${q.join(" ")} `)) return true;

  // Fall back to ordered overlap: most of the quote's words, in order.
  let i = 0;
  let matched = 0;
  for (const word of q) {
    const found = t.indexOf(word, i);
    if (found !== -1) {
      matched += 1;
      i = found + 1;
    }
  }
  return matched / q.length >= 0.8;
}

/** True only when the speaker said exactly these words, in this order. */
export function isVerbatim(phrase: string, transcript: string): boolean {
  const q = words(phrase);
  return q.length > 0 && ` ${words(transcript).join(" ")} `.includes(` ${q.join(" ")} `);
}

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven",
  "8": "eight", "9": "nine", "10": "ten", "11": "eleven", "12": "twelve", "15": "fifteen", "20": "twenty",
  "30": "thirty", "40": "forty", "50": "fifty", "100": "hundred", "1000": "thousand",
};

const ALWAYS_FINE = new Set(["i", "i'm", "i'd", "i've", "i'll", "ok", "okay"]);

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*["”’)]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/**
 * Names and numbers in `text` that nobody said: capitalized words (other than
 * the first word of a sentence) and figures that appear nowhere in the sources.
 */
export function unsupportedTerms(text: string, sources: Sources): string[] {
  const known = new Set(words(`${sources.transcript} ${sources.question ?? ""} ${sources.person ?? ""}`));
  const unsupported: string[] = [];

  for (const sentence of sentences(text)) {
    const tokens = sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
    tokens.forEach((token, index) => {
      const lower = normalize(token).replace(/'s$/, "");
      const hasDigit = /\d/.test(token);
      const isName = index > 0 && /^\p{Lu}/u.test(token) && !ALWAYS_FINE.has(lower);
      if (!hasDigit && !isName) return;
      if (hasDigit) {
        const digits = lower.replace(/[^\d]/g, "");
        if (known.has(digits) || known.has(lower) || (NUMBER_WORDS[digits] && known.has(NUMBER_WORDS[digits]))) return;
      } else if (lower.split("-").every((part) => known.has(part))) {
        return;
      }
      unsupported.push(token);
    });
  }
  return unsupported;
}

function tidy(text: string | undefined | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function tidyHeadline(text: string): string {
  const clean = tidy(text).replace(/[.。]+$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Keeps the context to at most three sentences, dropping any that name something nobody said. */
function groundContext(detail: string, sources: Sources): string {
  return sentences(tidy(detail))
    .filter((s) => unsupportedTerms(s, sources).length === 0)
    .slice(0, 3)
    .join(" ");
}

/** Returns the thing, trimmed to what can be traced back to the conversation, or null. */
export function groundThing(thing: DistilledThing, sources: Sources): DistilledThing | null {
  const headline = tidyHeadline(thing.headline ?? "");
  const quote = tidy(thing.quote);
  if (!headline || !isGrounded(quote, sources.transcript)) return null;
  if (unsupportedTerms(headline, sources).length > 0) return null;

  const grounded: DistilledThing = { headline, detail: groundContext(thing.detail ?? "", sources), quote };

  const said = tidy(thing.said).replace(/^["“”']+|["“”']+$/g, "");
  if (said && words(said).length <= 25 && isVerbatim(said, sources.transcript)) grounded.said = said;

  const unclear = tidy(thing.unclear);
  if (unclear) grounded.unclear = /[?]$/.test(unclear) ? unclear : `${unclear.replace(/[.]+$/, "")}?`;

  return grounded;
}

/**
 * Normalizes an editor response and removes anything that can't be traced back
 * to what was said. Never adds; only keeps, trims or drops.
 */
export function groundResponse(response: DistillResponse, sources: Sources): DistillResponse {
  const seen = new Set<string>();
  const things: DistilledThing[] = [];

  for (const candidate of response.things ?? []) {
    const thing = groundThing(candidate, sources);
    if (!thing) continue;
    const key = thing.headline.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    things.push(thing);
    if (things.length === MAX_THINGS) break;
  }

  const extraThing = response.extra ? groundThing(response.extra, sources) : null;
  const extra = extraThing && !seen.has(extraThing.headline.toLowerCase()) ? extraThing : undefined;

  // A place is only kept if every word of it was said (in the question or the answer).
  const place = tidy(response.place).replace(/[.,]+$/, "");
  const placeKnown = place && words(place).every((w) => words(`${sources.transcript} ${sources.question ?? ""}`).includes(w));

  return {
    things,
    ...(extra ? { extra } : {}),
    topic: tidy(response.topic) || "Life",
    ...(placeKnown ? { place } : {}),
    answered: response.answered && things.length > 0,
  };
}
