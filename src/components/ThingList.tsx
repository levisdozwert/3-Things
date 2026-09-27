import type { Thing } from "../lib/types";
import styles from "./ThingList.module.css";

interface ThingListProps {
  things: Pick<Thing, "headline">[];
}

/** Headlines only, numbered: the compact form of 3 Things used on the saved card. */
export function ThingList({ things }: ThingListProps) {
  return (
    <ol className={styles.list} aria-label={`${things.length} ${things.length === 1 ? "thing" : "things"}`}>
      {things.map((thing, i) => (
        <li key={i} className={styles.item}>
          <span className={`serif tabular ${styles.number}`} aria-hidden="true">
            {i + 1}
          </span>
          <p className={styles.headline}>{thing.headline}</p>
        </li>
      ))}
    </ol>
  );
}
