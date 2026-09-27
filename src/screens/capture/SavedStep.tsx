import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SavedCard } from "../../components/SavedCard";
import type { Capture } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./SavedStep.module.css";

interface SavedStepProps {
  capture: Capture;
  onAskAnother: () => void;
  onDone: () => void;
}

export function SavedStep({ capture, onAskAnother, onDone }: SavedStepProps) {
  return (
    <>
      <div className={flow.topbar} />

      <div className={`${flow.content} ${styles.content}`}>
        <p className={styles.saved}>
          <span className={styles.check}>
            <Icon name="check" size={16} strokeWidth={2.2} />
          </span>
          Saved to your 3 Things
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
          <Button variant="quiet" onClick={onAskAnother} className={styles.another}>
            Ask another
          </Button>
          <Button variant="ink" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
