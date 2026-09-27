import { useEffect, useState, type CSSProperties } from "react";
import { IconButton } from "../../components/Button";
import { timer } from "../../lib/format";
import { withTransition } from "../../lib/transition";
import flow from "./Flow.module.css";
import styles from "./ProcessingStep.module.css";

const STAGES = ["Listening back", "Finding the main ideas", "Keeping the context", "Making it clear"];
const STAGE_MS = 950;
/** How long "Got it." holds before the work begins to show. */
const GOT_IT_MS = 1500;

interface ProcessingStepProps {
  question: string;
  /** How long the conversation was, once the recording has closed. */
  durationSec: number | null;
  /** "Finding the three things", or for a follow-up, what's being done with it. */
  title?: string;
  onCancel: () => void;
}

/**
 * First a confident acknowledgement, "Got it.", with the three forms settling
 * back into the mark. Then, calmly, "Finding the three things".
 */
export function ProcessingStep({
  question,
  durationSec,
  title = "Finding the three things",
  onCancel,
}: ProcessingStepProps) {
  const [phase, setPhase] = useState<"got" | "finding">("got");
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => withTransition(() => setPhase("finding")), GOT_IT_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (phase !== "finding") return;
    const interval = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, STAGE_MS);
    return () => window.clearInterval(interval);
  }, [phase]);

  if (phase === "got") {
    return (
      <>
        <div className={flow.topbar} />
        <div className={`${flow.content} ${styles.got}`}>
          <p className={styles.recorded}>
            <span className={styles.recordedDot} aria-hidden="true" />
            {durationSec === null ? "Stopped" : `Recorded · ${timer(durationSec)}`}
          </p>
          <p className={`${flow.question} ${styles.gotQuestion}`}>{question}</p>
          <div className={styles.gotStage}>
            {/* Each form becomes one of the three positions, then one of the three things. */}
            <span className={styles.forms} aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} style={{ viewTransitionName: `position-${n}` } as CSSProperties} />
              ))}
            </span>
            <h1 className={`serif ${styles.gotIt}`}>Got it.</h1>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Stop without keeping" onClick={onCancel} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.question} ${flow.questionSM}`}>{question}</p>

        <div className={styles.heading}>
          <h1 className={`serif ${styles.title}`}>{title}</h1>
          <p className={styles.stages} aria-live="polite">
            <span key={stage} className={styles.stage}>
              {STAGES[stage]}
            </span>
          </p>
        </div>

        <ol className={styles.positions} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.position} style={{ "--i": i } as CSSProperties}>
              <span
                className={styles.marker}
                style={{ viewTransitionName: `position-${i + 1}` } as CSSProperties}
              />
              <span className={styles.lines}>
                <span className={styles.line} style={{ width: ["74%", "88%", "62%"][i] }} />
                <span className={`${styles.line} ${styles.lineSoft}`} style={{ width: ["92%", "70%", "84%"][i] }} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
