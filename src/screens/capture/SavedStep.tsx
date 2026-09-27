import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SavedCard } from "../../components/SavedCard";
import { Sheet } from "../../components/Sheet";
import { TOPICS } from "../../components/ThingsEditor";
import { shareCapture, type ShareResult } from "../../lib/share";
import { useStore } from "../../lib/store";
import type { Capture } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./SavedStep.module.css";

interface SavedStepProps {
  capture: Capture;
  onDone: () => void;
}

const SHARE_LABEL: Partial<Record<ShareResult, string>> = {
  copied: "Copied",
  failed: "Couldn’t share",
};

export function SavedStep({ capture: saved, onDone }: SavedStepProps) {
  const { getCapture, updateCapture } = useStore();
  const capture = getCapture(saved.id) ?? saved;
  const [shared, setShared] = useState<ShareResult | null>(null);
  const [filing, setFiling] = useState(false);
  const [topic, setTopic] = useState(capture.topic);
  const [place, setPlace] = useState(capture.place ?? "");

  useEffect(() => {
    if (!shared) return;
    const timeout = window.setTimeout(() => setShared(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [shared]);

  const openFiling = () => {
    setTopic(capture.topic);
    setPlace(capture.place ?? "");
    setFiling(true);
  };

  const topics = Array.from(new Set([capture.topic, ...TOPICS].filter(Boolean)));

  return (
    <>
      <div className={flow.topbar} />

      <div className={`${flow.content} ${styles.content}`}>
        <p className={styles.saved}>
          <span className={styles.check}>
            <Icon name="check" size={16} strokeWidth={2.2} />
          </span>
          Saved to your 3&nbsp;Things
          <Link to={`/library/${capture.id}`} viewTransition className={styles.view}>
            View
          </Link>
        </p>
        <div className={styles.card}>
          <SavedCard capture={capture} />
        </div>
        <p className={styles.filed}>
          <span>
            Filed under <strong>{[capture.topic, capture.place].filter(Boolean).join(" · ")}</strong>
          </span>
          <button type="button" onClick={openFiling}>
            Change
          </button>
        </p>
      </div>

      <div className={flow.footer}>
        <div className={flow.footerRow}>
          <Button
            variant="quiet"
            icon={shared === "copied" ? "check" : "share"}
            className={styles.share}
            onClick={async () => setShared(await shareCapture(capture))}
          >
            {(shared && SHARE_LABEL[shared]) || "Share"}
          </Button>
          <Button variant="ink" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>

      <Sheet
        open={filing}
        title="What’s this about?"
        onClose={() => setFiling(false)}
        actions={
          <Button
            variant="ink"
            block
            onClick={() => {
              updateCapture(capture.id, { topic: topic.trim() || capture.topic, place: place.trim() || undefined });
              setFiling(false);
            }}
          >
            Done
          </Button>
        }
      >
        <div className={styles.filing}>
          <div className={styles.topics} role="radiogroup" aria-label="Topic">
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={topic === t}
                className={`${styles.topic} ${topic === t ? styles.topicOn : ""}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className={styles.placeField}>
            <span>Where</span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="A place, if it’s about one"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
            />
          </label>
        </div>
      </Sheet>
    </>
  );
}
