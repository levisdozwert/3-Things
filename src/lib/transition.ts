import { flushSync } from "react-dom";

type DocWithTransitions = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export type Direction = "forward" | "back" | "none";

/**
 * Runs a state change inside a view transition when the browser supports it,
 * so shared elements (the question, the ember button, the three forms) glide
 * between steps instead of jumping. Forward steps drift in from the right and
 * Back returns from the left. Falls back to an instant change.
 */
export function withTransition(update: () => void, direction: Direction = "none") {
  const doc = document as DocWithTransitions;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.nav = direction;
  const transition = doc.startViewTransition(() => flushSync(update));
  // Router navigations (tabs, Home → Ask) use the plain crossfade.
  void transition.finished.finally(() => {
    if (root.dataset.nav === direction) root.dataset.nav = "none";
  });
}
