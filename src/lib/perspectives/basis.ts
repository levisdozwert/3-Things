import type { Capture } from "../types";

/**
 * A fingerprint of the answers perspectives were read from: which ones, and
 * what their things say now. Renaming someone doesn't change it; a new answer
 * or an edited thing does, and then they're read again.
 */
export function basisOf(answers: Capture[]): string {
  const text = answers.map((c) => `${c.id}:${c.things.map((t) => `${t.id}=${t.headline}`).join("|")}`).join(";");
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${answers.length}-${(hash >>> 0).toString(36)}`;
}
