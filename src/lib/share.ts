import { fromLine } from "./format";
import type { Capture } from "./types";

/** Plain text a person could paste anywhere: whose they are, the question, the three things. */
export function shareText(capture: Capture): string {
  const things = capture.things.map((t, i) => `${i + 1}. ${t.headline}${t.detail ? `\n   ${t.detail}` : ""}`);
  return [fromLine(capture.things.length, capture.person), capture.question, "", ...things, "", "Kept with 3 Things"].join(
    "\n",
  );
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * A first, basic share: the system share sheet where there is one, otherwise
 * the clipboard. Links, images and people come later.
 */
export async function shareCapture(capture: Capture): Promise<ShareResult> {
  const text = shareText(capture);
  const data = { title: fromLine(capture.things.length, capture.person), text };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
