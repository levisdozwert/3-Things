import { AudioPlayer } from "../../components/AudioPlayer";
import { Button, IconButton } from "../../components/Button";
import type { Recording } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./ProblemStep.module.css";

export type Problem = "nothing-heard" | "failed";

interface ProblemStepProps {
  kind: Problem;
  question: string;
  recording: Recording | null;
  onRetry: () => void;
  onRecordAgain: () => void;
  onWriteYourself: () => void;
  onClose: () => void;
}

/**
 * When we can't find their three things, we say so. We never fill the gap
 * with something that sounds right.
 */
export function ProblemStep({
  kind,
  question,
  recording,
  onRetry,
  onRecordAgain,
  onWriteYourself,
  onClose,
}: ProblemStepProps) {
  const heard = kind === "nothing-heard";

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.question} ${flow.questionSM}`}>{question}</p>
        <div className={`${styles.body} ${flow.enter}`}>
          <h1 className={`serif ${styles.title}`}>
            {heard ? "We couldn’t make out their answer" : "Something interrupted us"}
          </h1>
          <p className={styles.text}>
            {heard
              ? "The recording was too quiet or too short to find three things in it. Rather than guess, we’ve left it to you."
              : "Your recording is safe. Try finding the three things again in a moment."}
          </p>
          {recording?.audio && <AudioPlayer blob={recording.audio} durationSec={recording.durationSec} />}
        </div>
      </div>

      <div className={flow.footer}>
        {heard ? (
          <Button block icon="mic" onClick={onRecordAgain}>
            Ask again
          </Button>
        ) : (
          <Button block onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button block variant="text" size="md" onClick={onWriteYourself}>
          Write their things down yourself
        </Button>
      </div>
    </>
  );
}
