import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { groupOf } from "../lib/questions";
import { describeArrivals, type Notice } from "../lib/remote/arrivals";
import { useRemoteSync } from "../lib/remote/useRemoteSync";
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
  const { settings, captures } = useStore();
  const location = useLocation();
  const [shown, setShown] = useState<Notice | null>(null);

  useRemoteSync((arrivals) => {
    if (!settings.notifyAnswers) return;
    const fresh = new Set(arrivals.map((a) => a.captureId));
    const notice = describeArrivals(arrivals, (group) => captures.filter((c) => groupOf(c) === group && !fresh.has(c.id)).length);
    setShown(notice);
    // A device notification only if the user turned it on, and only when the app isn't in view.
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
      new Notification(notice.title, { body: notice.line, tag: notice.captureId });
    }
  });

  useEffect(() => {
    if (!shown) return;
    const timeout = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(timeout);
  }, [shown]);

  // Never over someone's answer, or the page it points to.
  const here = location.pathname;
  if (!shown || here.startsWith("/a/") || here === `/library/${shown.captureId}` || here === shown.to || here.startsWith(`${shown.to}/`)) {
    return null;
  }

  return (
    <div className={styles.notice} role="status">
      <Link to={shown.to} viewTransition className={styles.body} onClick={() => setShown(null)}>
        <Avatar name={shown.name} size="sm" />
        <span className={styles.text}>
          <span className={styles.title}>{shown.title}</span>
          <span className={styles.question}>{shown.line}</span>
        </span>
        <span className={styles.see}>See</span>
      </Link>
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => setShown(null)}>
        <Icon name="close" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
