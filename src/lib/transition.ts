import { flushSync } from "react-dom";

type DocWithTransitions = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/**
 * Runs a state change inside a view transition when the browser supports it,
 * so shared elements (the question, the three positions) glide between steps
 * instead of jumping. Falls back to an instant change.
 */
export function withTransition(update: () => void) {
  const doc = document as DocWithTransitions;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}
