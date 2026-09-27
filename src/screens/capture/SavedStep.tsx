import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SavedCard } from "../../components/SavedCard";
import { shareCapture, type ShareResult } from "../../lib/share";
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

export function SavedStep({ capture, onDone }: SavedStepProps) {
  const [shared, setShared] = useState<ShareResult | null>(null);

  useEffect(() => {
    if (!shared) return;
    const timeout = window.setTimeout(() => setShared(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [shared]);

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
    </>
  );
}
