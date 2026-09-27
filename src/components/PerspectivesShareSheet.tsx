import { useEffect, useState } from "react";
import { perspectivesText, type SharedPoint } from "../lib/share";
import { renderPerspectivesCard } from "../lib/shareCard";
import { namesOf } from "../lib/questions";
import type { Capture } from "../lib/types";
import { Button } from "./Button";
import { Mark } from "./Mark";
import { Sheet } from "./Sheet";
import card from "./SavedCard.module.css";
import styles from "./ShareSheet.module.css";

interface PerspectivesShareSheetProps {
  open: boolean;
  question: string;
  answers: Capture[];
  /** How each answer's person reads, in the same order. */
  names: string[];
  onClose: () => void;
}

/**
 * Sharing perspectives, deliberately and only on purpose: the question, whose
 * perspectives they are, and one point from each person with their name on it.
 * These answers were shared with you, not with everyone, so the sheet says so.
 */
export function PerspectivesShareSheet({ open, question, answers, names, onClose }: PerspectivesShareSheetProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = answers.slice(0, 4);
  // Each person's own first point: a small selection, never the whole of anyone's answer.
  const points: SharedPoint[] = shown.flatMap((c, i) => (c.things[0] ? [{ headline: c.things[0].headline, name: names[i] }] : []));
  const who = namesOf(names, 4);
  const text = perspectivesText(question, who, points);
  const title = `Perspectives from ${who}`;
  const fileName = "perspectives.png";

  useEffect(() => {
    if (open) setStatus(null);
  }, [open]);

  const share = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const file = new File([await renderPerspectivesCard({ question, names: who, points })], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        onClose();
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text });
        onClose();
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus("Copied as text.");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setStatus("Couldn’t share from this browser.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    try {
      const url = URL.createObjectURL(await renderPerspectivesCard({ question, names: who, points }));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Saved the picture.");
    } catch {
      setStatus("Couldn’t make the picture.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied as text.");
    } catch {
      setStatus("Couldn’t copy.");
    }
  };

  return (
    <Sheet
      open={open}
      title="Share these perspectives"
      onClose={onClose}
      actions={
        <>
          <Button variant="ink" block icon="share" disabled={busy} onClick={() => void share()}>
            Share
          </Button>
          <div className={styles.more}>
            <button type="button" onClick={() => void save()}>
              Save picture
            </button>
            <button type="button" onClick={() => void copy()}>
              Copy as text
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      }
    >
      <div className={styles.preview}>
        <article className={card.card} aria-label={title}>
          <p className={card.eyebrow}>{title}</p>
          <h2 className={`serif ${card.question}`}>{question}</h2>
          <ul className={styles.points}>
            {points.map((p) => (
              <li key={`${p.name}-${p.headline}`}>
                <span className="serif">{p.headline}</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
          <footer className={card.footer}>
            <span>3 Things</span>
            <Mark size="sm" />
          </footer>
        </article>
      </div>
      <p className={styles.note}>
        These are other people’s answers. {who} shared them with you, so share them the way they’d be comfortable with.
        Only the question, their names and one point from each go: no recordings, no notes, nothing else they said.
      </p>
      {status && (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      )}
    </Sheet>
  );
}
