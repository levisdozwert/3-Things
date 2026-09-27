import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ListeningVisual } from "../../components/ListeningVisual";
import { timer } from "../../lib/format";
import flow from "./Flow.module.css";
import styles from "./ListeningStep.module.css";

export type ListeningProblem = "denied" | "unavailable" | "failed";

/** A pause this long is someone thinking. Say something kind, quietly. */
const TAKE_YOUR_TIME_SEC = 10;
const STILL_LISTENING_SEC = 35;
/** After this long without a touch, the controls step back. */
const RECEDE_AFTER_MS = 6000;

interface ListeningStepProps {
  /** The question, or for a follow-up, what to ask them now. */
  question: string;
  /** Set when going back to the speaker: "Asking for one more", "A quick follow-up". */
  followUpLabel?: string;
  person: string;
  elapsed: number;
  analyserRef: RefObject<AnalyserNode | null>;
  simulated: boolean;
  paused: boolean;
  problem: ListeningProblem | null;
  starting: boolean;
  canPreview: boolean;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onPreviewWithoutMic: () => void;
}

/**
 * The phone steps out of the conversation. The question stays at the top,
 * three forms show that a voice is being heard, and almost nothing else.
 * There is no transcript, no counting, and nothing asks for three points.
 */
export function ListeningStep(props: ListeningStepProps) {
  if (props.problem) return <ListeningProblemView {...props} problem={props.problem} />;
  return <Listening {...props} />;
}

function Listening({
  question,
  followUpLabel,
  person,
  elapsed,
  analyserRef,
  simulated,
  paused,
  onStop,
  onPause,
  onResume,
  onCancel,
}: ListeningStepProps) {
  const name = person.trim();
  const [quiet, setQuiet] = useState<"none" | "short" | "long">("none");
  const [receded, setReceded] = useState(false);
  const speaking = useRef(false);
  const quietSince = useRef(performance.now());

  const onSpeakingChange = useCallback((now: boolean) => {
    speaking.current = now;
    quietSince.current = performance.now();
    if (now) setQuiet("none");
  }, []);

  // Silence is fine. After a while, a gentle line; never a countdown, never an automatic stop.
  useEffect(() => {
    if (paused) {
      setQuiet("none");
      return;
    }
    quietSince.current = performance.now();
    const tick = window.setInterval(() => {
      if (speaking.current) return;
      const seconds = (performance.now() - quietSince.current) / 1000;
      setQuiet(seconds >= STILL_LISTENING_SEC ? "long" : seconds >= TAKE_YOUR_TIME_SEC ? "short" : "none");
    }, 1000);
    return () => window.clearInterval(tick);
  }, [paused]);

  // When nobody is touching the phone, the controls fade back so the people stay in focus.
  useEffect(() => {
    let timeout = 0;
    const wake = () => {
      setReceded(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setReceded(true), RECEDE_AFTER_MS);
    };
    wake();
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  const line = paused
    ? "Paused. Nothing is being recorded."
    : quiet === "long"
      ? "Still listening."
      : quiet === "short"
        ? "Take your time."
        : "Speak naturally. We’ll keep the ideas that matter.";

  const status = paused ? "Paused" : name ? `Listening to ${name}` : "Listening";

  return (
    <div className={`${styles.listening} ${receded && !paused ? styles.receded : ""}`}>
      <div className={`${flow.topbar} ${styles.chrome}`}>
        <IconButton icon="close" label="Stop without keeping" onClick={onCancel} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${styles.status} ${paused ? styles.statusPaused : ""}`}>
          <span className={styles.dot} aria-hidden="true" />
          {status}
          {simulated && <span className={styles.preview}> · preview</span>}
        </p>
        {followUpLabel && <p className={styles.followUp}>{followUpLabel}</p>}
        <p className={`${flow.question} ${styles.question}`}>{followUpLabel ? `“${question}”` : question}</p>

        <div className={styles.stage}>
          <div className={styles.visual}>
            <ListeningVisual
              analyserRef={analyserRef}
              simulate={simulated}
              paused={paused}
              onSpeakingChange={onSpeakingChange}
            />
          </div>
          <p className={styles.line} aria-live="polite">
            <span key={line}>{line}</span>
          </p>
        </div>
      </div>

      <div className={`${flow.footer} ${styles.footer}`}>
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.pause} ${styles.chrome}`}
            onClick={paused ? onResume : onPause}
            aria-label={paused ? "Resume" : "Pause"}
          >
            <Icon name={paused ? "play" : "pause"} size={20} />
          </button>
          <button type="button" className={styles.stop} onClick={onStop} aria-label="Stop">
            <Icon name="stop" size={30} />
          </button>
          <span className={`tabular ${styles.timer} ${styles.chrome}`} aria-label={`Recorded ${timer(elapsed)}`}>
            {timer(elapsed)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ListeningProblemView({
  question,
  problem,
  starting,
  canPreview,
  onRetry,
  onCancel,
  onPreviewWithoutMic,
}: ListeningStepProps & { problem: ListeningProblem }) {
  const copy = {
    denied: {
      title: "We couldn’t access your microphone.",
      body: "Check microphone access and try again.",
    },
    unavailable: {
      title: "We couldn’t find a microphone.",
      body: "Connect one or check your device’s settings, then try again.",
    },
    failed: {
      title: "The recording stopped.",
      body: "The microphone was interrupted, so nothing was kept. Try again when you’re ready.",
    },
  }[problem];

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Close" onClick={onCancel} />
      </div>
      <div className={`${flow.content} ${styles.problem}`}>
        <p className={`${flow.question} ${flow.questionSM}`}>{question}</p>
        <div className={`${styles.problemBody} ${flow.enter}`}>
          <span className={styles.problemIcon}>
            <Icon name="mic" size={24} />
          </span>
          <h1 className={`serif ${styles.problemTitle}`}>{copy.title}</h1>
          <p className={styles.problemText}>{copy.body}</p>
        </div>
      </div>
      <div className={flow.footer}>
        <Button block icon="mic" onClick={onRetry} disabled={starting}>
          Try again
        </Button>
        {canPreview && problem !== "failed" && (
          <Button block variant="text" size="md" onClick={onPreviewWithoutMic}>
            Preview without the microphone
          </Button>
        )}
        {problem === "failed" && (
          <Button block variant="text" size="md" onClick={onCancel}>
            Close
          </Button>
        )}
      </div>
    </>
  );
}
