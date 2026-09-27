import styles from "./Mark.module.css";

interface MarkProps {
  /** Animate the three marks like a gentle voice level. */
  live?: boolean;
  /** How many of the three marks are filled (for a capture with fewer than three things). */
  filled?: number;
  size?: "sm" | "md";
  tone?: "ember" | "muted";
  className?: string;
}

/**
 * The 3 Things mark: three vertical strokes. It reads as a voice level and as
 * the three things at once, and appears quietly wherever listening happens.
 */
export function Mark({ live = false, filled = 3, size = "md", tone = "ember", className }: MarkProps) {
  return (
    <span
      className={[styles.mark, styles[size], tone === "muted" ? styles.muted : "", live ? styles.live : "", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < filled ? styles.bar : `${styles.bar} ${styles.empty}`} />
      ))}
    </span>
  );
}

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <Mark />
      <span className={`serif ${styles.word}`}>
        <span className={styles.three}>3</span> Things
      </span>
    </span>
  );
}
