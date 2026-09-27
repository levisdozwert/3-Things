import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRemoteSync, type Arrival } from "../lib/remote/useRemoteSync";
import { useStore } from "../lib/store";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import styles from "./ArrivalNotice.module.css";

const SHOW_MS = 9000;

/**
 * The one thing 3 Things ever tells you unprompted: someone sent their 3
 * back. Quiet, brief, and only if you want it. No streaks, no nudges.
 */
export function ArrivalNotice() {
  const { settings } = useStore();
  const location = useLocation();
  const [shown, setShown] = useState<Arrival | null>(null);

  useRemoteSync((arrivals) => {
    if (!settings.notifyAnswers) return;
    const latest = arrivals[arrivals.length - 1];
    setShown(latest);
    // A device notification only if the user turned it on, and only when the app isn't in view.
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
      new Notification(`${latest.name} answered your question`, { body: latest.question, tag: latest.captureId });
    }
  });

  useEffect(() => {
    if (!shown) return;
    const timeout = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(timeout);
  }, [shown]);

  // Never over someone's answer, or the conversation it points to.
  if (!shown || location.pathname.startsWith("/a/") || location.pathname === `/library/${shown.captureId}`) return null;

  return (
    <div className={styles.notice} role="status">
      <Link to={`/library/${shown.captureId}`} viewTransition className={styles.body} onClick={() => setShown(null)}>
        <Avatar name={shown.name} size="sm" />
        <span className={styles.text}>
          <span className={styles.title}>{shown.name} answered your question</span>
          <span className={styles.question}>{shown.question}</span>
        </span>
        <span className={styles.see}>See</span>
      </Link>
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => setShown(null)}>
        <Icon name="close" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
