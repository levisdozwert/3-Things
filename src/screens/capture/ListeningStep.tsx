import type { RefObject } from "react";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ListeningVisual } from "../../components/ListeningVisual";
import { Mark } from "../../components/Mark";
import { clock } from "../../lib/format";
import flow from "./Flow.module.css";
import styles from "./ListeningStep.module.css";

interface ListeningStepProps {
  question: string;
  elapsed: number;
  analyserRef: RefObject<AnalyserNode | null>;
  simulated: boolean;
  blocked: "denied" | "unavailable" | null;
  starting: boolean;
  onStop: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onContinueWithoutMic: () => void;
}

/**
 * The quietest screen in the app. No transcript, no words scrolling by —
 * nothing that makes someone feel every word is being written down.
 */
export function ListeningStep({
  question,
  elapsed,
  analyserRef,
  simulated,
  blocked,
  starting,
  onStop,
  onCancel,
  onRetry,
  onContinueWithoutMic,
}: ListeningStepProps) {
  if (blocked) {
    return (
      <>
        <div className={flow.topbar}>
          <IconButton icon="close" label="Close" onClick={onCancel} />
        </div>
        <div className={`${flow.content} ${styles.blocked}`}>
          <p className={`${flow.question} ${flow.questionSM}`}>{question}</p>
          <div className={`${styles.blockedBody} ${flow.enter}`}>
            <span className={styles.blockedIcon}>
              <Icon name="mic" size={26} />
            </span>
            <h1 className={`serif ${styles.blockedTitle}`}>We can’t hear anything yet</h1>
            <p className={styles.blockedText}>
              {blocked === "denied"
                ? "3 Things needs your microphone to listen. Allow it in your browser’s settings, then try again."
                : "We couldn’t find a microphone on this device."}
            </p>
          </div>
        </div>
        <div className={flow.footer}>
          {blocked === "denied" && (
            <Button block onClick={onRetry} disabled={starting}>
              Try again
            </Button>
          )}
          <Button block variant="text" size="md" onClick={onContinueWithoutMic}>
            Preview without the microphone
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Stop without keeping" onClick={onCancel} />
        <span className={`tabular ${styles.clock}`} aria-live="off">
          {clock(elapsed)}
        </span>
        <span className={styles.topbarSpacer} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.question} ${flow.questionSM} ${styles.question}`}>{question}</p>

        <div className={styles.stage}>
          <div className={styles.visual}>
            <ListeningVisual analyserRef={analyserRef} simulate={simulated} size={288} />
          </div>
          <p className={styles.indicator}>
            <Mark live size="sm" />
            {simulated ? "Preview · the microphone is off" : "Listening for the ideas that matter"}
          </p>
          <p className={styles.support}>Speak naturally. We’ll organize the three things afterward.</p>
        </div>
      </div>

      <div className={`${flow.footer} ${styles.footer}`}>
        <button type="button" className={styles.stop} onClick={onStop} aria-label="Stop listening">
          <Icon name="stop" size={30} />
        </button>
        <span className={styles.stopLabel}>Stop</span>
      </div>
    </>
  );
}
