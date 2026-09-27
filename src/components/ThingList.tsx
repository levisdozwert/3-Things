import type { CSSProperties } from "react";
import type { Thing } from "../lib/types";
import styles from "./ThingList.module.css";

interface ThingListProps {
  things: Pick<Thing, "headline" | "detail" | "quote">[];
  /** Headlines only, for cards and summaries. */
  compact?: boolean;
  /** Reveal 1, 2 and 3 one after another. */
  reveal?: boolean;
  /** Show the speaker's own words under each thing. */
  showQuotes?: boolean;
  divided?: boolean;
  /** Name the three positions so they glide between steps of the flow. */
  morph?: boolean;
  /** Used for the empty-position note when someone shared fewer than three. */
  person?: string;
  showEmptyPositions?: boolean;
}

export function ThingList({
  things,
  compact = false,
  reveal = false,
  showQuotes = false,
  divided = false,
  morph = false,
  person = "",
  showEmptyPositions = false,
}: ThingListProps) {
  const missing = showEmptyPositions ? Math.max(0, 3 - things.length) : 0;
  const who = person.trim() || "They";

  return (
    <ol
      className={[styles.list, compact ? styles.compact : "", divided ? styles.divided : ""].join(" ")}
      aria-label={`${things.length} ${things.length === 1 ? "thing" : "things"}`}
    >
      {things.map((thing, i) => (
        <li
          key={i}
          className={`${styles.item} ${reveal ? styles.reveal : ""}`}
          style={{ "--i": i } as CSSProperties}
        >
          <span
            className={`serif tabular ${styles.number}`}
            style={morph ? ({ viewTransitionName: `position-${i + 1}` } as CSSProperties) : undefined}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <div className={styles.body}>
            <p className={styles.headline}>{thing.headline}</p>
            {!compact && thing.detail && <p className={styles.detail}>{thing.detail}</p>}
            {!compact && showQuotes && thing.quote && (
              <blockquote className={`serif ${styles.quote}`}>“{thing.quote}”</blockquote>
            )}
          </div>
        </li>
      ))}
      {missing > 0 && (
        <li
          className={`${styles.item} ${styles.missing} ${reveal ? styles.reveal : ""}`}
          style={{ "--i": things.length } as CSSProperties}
        >
          <span
            className={`serif tabular ${styles.number}`}
            style={morph ? ({ viewTransitionName: `position-${things.length + 1}` } as CSSProperties) : undefined}
            aria-hidden="true"
          >
            {things.length + 1}
          </span>
          <p className={styles.missingNote}>
            {who} shared {things.length === 1 ? "one thing" : "two things"}. We didn’t fill the {things.length === 1 ? "rest" : "third"}.
          </p>
        </li>
      )}
    </ol>
  );
}
