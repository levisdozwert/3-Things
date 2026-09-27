import { calendarDate, fromLine } from "../lib/format";
import type { Capture } from "../lib/types";
import { Avatar } from "./Avatar";
import { Mark } from "./Mark";
import { ThingList } from "./ThingList";
import styles from "./SavedCard.module.css";

/** The keepsake: a question, a person, and the three things they said. */
export function SavedCard({ capture }: { capture: Capture }) {
  return (
    <article className={styles.card} aria-label={`${fromLine(capture.things.length, capture.person)}`}>
      <p className={styles.eyebrow}>Question</p>
      <h2 className={`serif ${styles.question}`}>{capture.question}</h2>

      <div className={styles.from}>
        <Avatar name={capture.person} size="sm" />
        <span>{fromLine(capture.things.length, capture.person)}</span>
      </div>

      <ThingList things={capture.things} />

      <footer className={styles.footer}>
        <span>Recorded {calendarDate(capture.recordedAt)}</span>
        <Mark size="sm" filled={capture.things.length} />
      </footer>
    </article>
  );
}
