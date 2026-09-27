import type { CSSProperties, ReactNode } from "react";
import type { Thing } from "../lib/types";
import styles from "./ThingsEditorial.module.css";

interface ThingsEditorialProps {
  things: Thing[];
  /** Whose words these are. Used to attribute a quote. */
  person: string;
  /** Reveal 01, 02 and 03 one after another. */
  reveal?: boolean;
  /** Let the three positions glide in from the processing screen. */
  morph?: boolean;
  /** Things just added or clarified, which get a brief, quiet highlight. */
  fresh?: string[];
  /** On review: ways to resolve something the speaker left unclear. */
  onClarify?: (index: number) => void;
  onEdit?: (index: number) => void;
  onKeep?: (index: number) => void;
  /** What sits in the next empty position when fewer than three came up. */
  missing?: ReactNode;
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Three distilled thoughts from a person, set like an editorial page:
 * a large numeral, the idea, and the context that makes it useful.
 */
export function ThingsEditorial({
  things,
  person,
  reveal = false,
  morph = false,
  fresh = [],
  onClarify,
  onEdit,
  onKeep,
  missing,
}: ThingsEditorialProps) {
  const who = person.trim();

  const numeral = (i: number, extraClass = "") => (
    <span
      className={`serif ${styles.number} ${extraClass}`}
      style={morph ? ({ viewTransitionName: `position-${i + 1}` } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {two(i + 1)}
    </span>
  );

  return (
    <ol className={styles.list}>
      {things.map((thing, i) => (
        <li
          key={thing.id}
          className={[styles.item, reveal ? styles.reveal : "", fresh.includes(thing.id) ? styles.fresh : ""].join(" ")}
          style={{ "--i": i } as CSSProperties}
        >
          {numeral(i)}
          <h3 className={`serif ${styles.headline}`}>
            <span className="visually-hidden">{i + 1}. </span>
            {thing.headline}
          </h3>
          {thing.detail && <p className={styles.context}>{thing.detail}</p>}
          {thing.said && (
            <figure className={styles.said}>
              <blockquote className="serif">“{thing.said}”</blockquote>
              {who && <figcaption>{who}</figcaption>}
            </figure>
          )}
          {thing.unclear && onClarify && (
            <div className={styles.unclear} role="group" aria-label="Needs clarification">
              <p className={styles.unclearNote}>We weren’t completely sure about this one.</p>
              <p className={styles.unclearAsk}>
                You could ask: <span className="serif">“{thing.unclear}”</span>
              </p>
              <div className={styles.unclearActions}>
                <button type="button" className={styles.clarify} onClick={() => onClarify(i)}>
                  Clarify
                </button>
                <button type="button" onClick={() => onEdit?.(i)}>
                  Edit
                </button>
                <button type="button" onClick={() => onKeep?.(i)}>
                  Keep as-is
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
      {missing && things.length < 3 && (
        <li
          className={`${styles.item} ${styles.missing} ${reveal ? styles.reveal : ""}`}
          style={{ "--i": things.length } as CSSProperties}
        >
          {numeral(things.length, styles.numberEmpty)}
          {missing}
        </li>
      )}
    </ol>
  );
}
