import { useEffect, useState } from "react";
import { fromLine } from "../lib/format";
import { shareCapture, shareText } from "../lib/share";
import { renderShareCard } from "../lib/shareCard";
import type { Capture } from "../lib/types";
import { Button } from "./Button";
import { SavedCard } from "./SavedCard";
import { Sheet } from "./Sheet";
import styles from "./ShareSheet.module.css";

interface ShareSheetProps {
  open: boolean;
  capture: Capture;
  onClose: () => void;
}

/**
 * Sharing someone's 3 Things, deliberately: a clean picture of the question,
 * their name and the three headlines, and a reminder whose words these are.
 */
export function ShareSheet({ open, capture, onClose }: ShareSheetProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = capture.person.trim();
  const title = fromLine(capture.things.length, capture.person);
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

  useEffect(() => {
    if (open) setStatus(null);
  }, [open]);

  const share = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const file = new File([await renderShareCard(capture)], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: shareText(capture) });
        onClose();
        return;
      }
      const result = await shareCapture(capture);
      if (result === "shared") onClose();
      else setStatus(result === "copied" ? "Copied as text." : result === "failed" ? "Couldn’t share from this browser." : null);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setStatus("Couldn’t share from this browser.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    try {
      const url = URL.createObjectURL(await renderShareCard(capture));
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
      await navigator.clipboard.writeText(shareText(capture));
      setStatus("Copied as text.");
    } catch {
      setStatus("Couldn’t copy.");
    }
  };

  return (
    <Sheet
      open={open}
      title="Share these 3 Things"
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
        <SavedCard capture={capture} />
      </div>
      <p className={styles.note}>
        {name
          ? `These are ${name}’s words. Share them the way ${name} would be comfortable with.`
          : "These came from a conversation. Share them thoughtfully."}{" "}
        Only the question, the name and the three things go: no recording, no notes.
      </p>
      {status && (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      )}
    </Sheet>
  );
}
