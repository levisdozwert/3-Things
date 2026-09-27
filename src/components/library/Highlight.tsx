import { highlightParts } from "../../lib/library";
import styles from "./Library.module.css";

/** Text with the words you searched for gently marked. */
export function Highlight({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms?.length) return <>{text}</>;
  return (
    <>
      {highlightParts(text, terms).map((part, i) =>
        part.match ? (
          <mark key={i} className={styles.mark}>
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
