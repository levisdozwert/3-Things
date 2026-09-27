import { useEffect, useState, type CSSProperties } from "react";
import { IconButton } from "../../components/Button";
import flow from "./Flow.module.css";
import styles from "./ProcessingStep.module.css";

const STAGES = ["Listening back", "Finding the main ideas", "Keeping the context", "Making it clear"];
const STAGE_MS = 950;

interface ProcessingStepProps {
  question: string;
  onCancel: () => void;
}

/** Calm, human, short. Three positions wait for the three things. */
export function ProcessingStep({ question, onCancel }: ProcessingStepProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, STAGE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Stop without keeping" onClick={onCancel} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.question} ${flow.questionSM}`}>{question}</p>

        <div className={styles.heading}>
          <h1 className={`serif ${styles.title}`}>Finding the three things</h1>
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
                className={`serif tabular ${styles.number}`}
                style={{ viewTransitionName: `position-${i + 1}` } as CSSProperties}
              >
                {i + 1}
              </span>
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
