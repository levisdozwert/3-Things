import { MAX_THINGS, type DistillResponse, type DistilledThing } from "./contract";

/**
 * No AI contamination: a thing is only kept if the words it came from can be
 * found in what the speaker actually said.
 */

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * True when the quote appears in the transcript, allowing for the small
 * differences speech recognition and punctuation introduce.
 */
export function isGrounded(quote: string, transcript: string): boolean {
  const q = words(quote);
  if (q.length === 0) return false;
  const t = words(transcript);
  const joined = ` ${t.join(" ")} `;
  if (joined.includes(` ${q.join(" ")} `)) return true;

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

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tidyHeadline(text: string): string {
  const clean = tidy(text).replace(/[.。]+$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normalizes an editor response and removes anything that can't be traced back
 * to the transcript. Never adds; only keeps or drops.
 */
export function groundResponse(response: DistillResponse, transcript: string): DistillResponse {
  const seen = new Set<string>();
  const things: DistilledThing[] = [];

  for (const thing of response.things) {
    const headline = tidyHeadline(thing.headline ?? "");
    if (!headline) continue;
    const key = headline.toLowerCase();
    if (seen.has(key)) continue;
    const quote = tidy(thing.quote ?? "");
    if (!isGrounded(quote, transcript)) continue;
    seen.add(key);
    things.push({ headline, detail: tidy(thing.detail ?? ""), quote });
    if (things.length === MAX_THINGS) break;
  }

  return {
    things,
    topic: tidy(response.topic ?? "") || "Life",
    answered: response.answered && things.length > 0,
  };
}
