import { calendarDate, fromLine } from "../lib/format";
import { useStore } from "../lib/store";
import type { Capture } from "../lib/types";
import { Avatar } from "./Avatar";
import { Mark } from "./Mark";
import { ThingList } from "./ThingList";
import styles from "./SavedCard.module.css";

/** The keepsake: a question, a person, and the three things they said. */
export function SavedCard({ capture }: { capture: Capture }) {
  const { getPerson } = useStore();
  const ids = capture.personIds ?? [];
  const photo = ids.length === 1 ? getPerson(ids[0])?.photo : undefined;
  return (
    <article className={styles.card} aria-label={`${fromLine(capture.things.length, capture.person)}`}>
      <p className={styles.eyebrow}>Question</p>
      <h2 className={`serif ${styles.question}`}>{capture.question}</h2>

      <div className={styles.from}>
        <Avatar name={capture.person} photo={photo} size="sm" />
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
