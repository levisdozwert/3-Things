import { useEffect, useRef, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Mark } from "../../components/Mark";
import { Orb } from "../../components/Orb";
import { BLOCKING_ERRORS, useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { detectMode } from "../../lib/distill/client";
import { listOf, tidyQuestion } from "../../lib/format";
import { withTransition } from "../../lib/transition";
import flow from "./Flow.module.css";
import styles from "./AskStep.module.css";

/** Human questions, not prompts. Tapping one uses it. */
const EXAMPLES = [
  "What are three things every first-time founder should know?",
  "What are three places I shouldn’t miss in Jersey City?",
  "What are three things life has taught you?",
];

const STARTERS = [
  ["Three things…", "What are three things"],
  ["Three places…", "What are three places"],
  ["Three mistakes…", "What are three mistakes"],
];

/** Used only when previewing without a microphone. */
const SAMPLE_QUESTION = "What are three things every first-time founder should know?";

type Mode =
  /** Blank: nothing is recording yet. */
  | "choose"
  /** Hearing the asker's question. No words on screen while they speak. */
  | "listening"
  /** The question, shown once so the asker can check it. */
  | "heard"
  /** Speech ended without words. */
  | "missed"
  | "typing"
  /** The microphone or speech service isn't available. */
  | "blocked";

interface AskStepProps {
  initialMode: "voice" | "type";
  initialText: string;
  /** Asking someone you know: who, and what you've asked them about before. */
  asking?: { name: string; photo?: string; topics: string[] };
  onContinue: (question: string) => void;
  onClose: () => void;
}

/**
 * The start of the conversation: what do you want to ask them?
 * Speaking is the natural way in; typing is always one tap away.
 */
export function AskStep({ initialMode, initialText, asking, onContinue, onClose }: AskStepProps) {
  const speech = useSpeechRecognition({ continuous: false });
  const [mode, setModeNow] = useState<Mode>(
    initialText || initialMode === "type" || !speech.supported ? "typing" : "choose",
  );
  const [text, setText] = useState(initialText);
  const [blockedBy, setBlockedBy] = useState<"mic" | "speech">("mic");
  const [simulated, setSimulated] = useState(false);
  const [canPreview, setCanPreview] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { start: startSpeech, stop: stopSpeech, abort: abortSpeech } = speech;

  const setMode = (next: Mode) => withTransition(() => setModeNow(next));

  useEffect(() => {
    void detectMode().then((m) => setCanPreview(m === "preview"));
  }, []);

  useEffect(() => () => abortSpeech(), [abortSpeech]);

  // When the browser finishes hearing the question, show it once.
  useEffect(() => {
    if (mode !== "listening" || simulated || speech.listening) return;
    if (speech.error && BLOCKING_ERRORS.has(speech.error)) {
      setBlockedBy("mic");
      setMode("blocked");
    } else if (speech.error === "network") {
      setBlockedBy("speech");
      setMode("blocked");
    } else if (speech.text.trim()) {
      setText(tidyQuestion(speech.text));
      setMode("heard");
    } else {
      setMode("missed");
    }
  }, [mode, simulated, speech.listening, speech.error, speech.text]);

  // Preview only: a stand-in question, so the flow can be felt without a microphone.
  useEffect(() => {
    if (mode !== "listening" || !simulated) return;
    const timer = window.setTimeout(() => {
      setText(SAMPLE_QUESTION);
      setMode("heard");
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [mode, simulated]);

  useEffect(() => {
    if (mode !== "typing") return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [mode]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, mode]);

  const listen = () => {
    setSimulated(false);
    if (!startSpeech()) {
      setBlockedBy("speech");
      setMode("blocked");
      return;
    }
    setMode("listening");
  };

  const listenToSample = () => {
    setSimulated(true);
    setMode("listening");
  };

  const cancelListening = () => {
    abortSpeech();
    setSimulated(false);
    setMode("choose");
  };

  const type = (value = text) => {
    abortSpeech();
    setText(value);
    setMode("typing");
  };

  const question = tidyQuestion(text);
  const submit = () => question && onContinue(question);

  const applyStarter = (starter: string) => {
    setText(`${starter} `);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  // Context only, never a gate: it helps you not ask the same thing twice by accident.
  const askingLine = asking && (
    <div className={`${styles.asking} ${flow.enter}`}>
      <p className={styles.askingWho}>
        <Avatar name={asking.name} photo={asking.photo} size="xs" />
        Asking <strong>{asking.name}</strong>
      </p>
      {asking.topics.length > 0 && (
        <p className={styles.askedAbout}>
          You’ve asked {asking.name} about {listOf(asking.topics)}.
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Close" onClick={onClose} />
        {mode === "typing" && speech.supported && (
          <Button variant="text" size="sm" icon="mic" onClick={listen}>
            Speak instead
          </Button>
        )}
      </div>

      {mode === "choose" && (
        <>
          <div className={`${flow.content} ${styles.content}`}>
            {askingLine}
            <h1 className={`serif ${styles.heading}`}>
              {asking ? `What do you want to ask ${asking.name}?` : "What do you want to ask?"}
            </h1>
            <p className={`${styles.lede} ${flow.enterLate}`}>Ask it the way you would ask them.</p>
            <section className={`${styles.examples} ${flow.enterLate}`} aria-labelledby="examples-label">
              <p id="examples-label" className={flow.label}>
                For example
              </p>
              <ul>
                {EXAMPLES.map((q) => (
                  <li key={q}>
                    <button type="button" className={`serif ${styles.example}`} onClick={() => onContinue(q)}>
                      “{q}”
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className={`${flow.footer} ${styles.footer}`}>
            <Orb label="Speak your question" onClick={listen} transitionName="ask-orb">
              <Icon name="mic" size={36} strokeWidth={1.6} />
            </Orb>
            <Button variant="text" size="md" icon="keyboard" onClick={() => type()}>
              Type instead
            </Button>
          </div>
        </>
      )}

      {mode === "listening" && (
        <>
          <div className={`${flow.content} ${styles.content}`}>
            <h1 className={`serif ${styles.heading} ${styles.headingQuiet}`}>What do you want to ask?</h1>
            <p className={styles.listening} aria-live="polite">
              <Mark live size="sm" className={speech.hearing || simulated ? styles.hearing : styles.waiting} />
              {simulated ? "Listening · preview" : "Listening"}
            </p>
            <p className={`${styles.lede} ${flow.enterLate}`}>Go ahead and ask it out loud.</p>
          </div>
          <div className={`${flow.footer} ${styles.footer}`}>
            <Orb
              label="Done"
              live
              onClick={() => {
                if (!simulated) return void stopSpeech();
                setText(SAMPLE_QUESTION);
                setMode("heard");
              }}
              transitionName="ask-orb"
              aria-label="Done asking"
            >
              <Icon name="check" size={34} strokeWidth={1.9} />
            </Orb>
            <Button variant="text" size="md" onClick={cancelListening}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {mode === "heard" && (
        <>
          <div className={`${flow.content} ${styles.content}`}>
            <p className={`${flow.label} ${flow.enter}`}>{simulated ? "Sample question" : "Your question"}</p>
            <h1 className={`${flow.question} ${flow.questionXL}`}>{text}</h1>
            <button type="button" className={`${styles.again} ${flow.enterLate}`} onClick={listen}>
              <Icon name="mic" size={16} strokeWidth={1.8} />
              Say it again
            </button>
          </div>
          <div className={flow.footer}>
            <div className={flow.footerRow}>
              <Button variant="quiet" icon="pencil" className={styles.edit} onClick={() => type(text)}>
                Edit
              </Button>
              <Button onClick={() => onContinue(text)}>Use this question</Button>
            </div>
          </div>
        </>
      )}

      {mode === "missed" && (
        <>
          <div className={`${flow.content} ${styles.content}`}>
            <h1 className={`serif ${styles.heading}`}>We didn’t catch that.</h1>
            <p className={`${styles.lede} ${flow.enterLate}`}>Try again a little closer to the phone, or type it.</p>
          </div>
          <div className={flow.footer}>
            <Button block icon="mic" onClick={listen}>
              Try again
            </Button>
            <Button block variant="text" size="md" icon="keyboard" onClick={() => type("")}>
              Type instead
            </Button>
            {canPreview && (
              <Button block variant="text" size="sm" onClick={listenToSample}>
                Preview with a sample question
              </Button>
            )}
          </div>
        </>
      )}

      {mode === "blocked" && (
        <>
          <div className={`${flow.content} ${styles.content}`}>
            <span className={`${styles.blockedIcon} ${flow.enter}`}>
              <Icon name="mic" size={24} />
            </span>
            <h1 className={`serif ${styles.heading}`}>
              {blockedBy === "mic" ? "We couldn’t access your microphone." : "Speaking isn’t available right now."}
            </h1>
            <p className={`${styles.lede} ${flow.enterLate}`}>
              {blockedBy === "mic" ? "Check microphone access and try again." : "You can type your question instead."}
            </p>
          </div>
          <div className={flow.footer}>
            {blockedBy === "mic" ? (
              <>
                <Button block onClick={listen}>
                  Try again
                </Button>
                <Button block variant="quiet" size="md" icon="keyboard" onClick={() => type("")}>
                  Type instead
                </Button>
              </>
            ) : (
              <Button block icon="keyboard" onClick={() => type("")}>
                Type instead
              </Button>
            )}
            {canPreview && (
              <Button block variant="text" size="md" onClick={listenToSample}>
                Preview with a sample question
              </Button>
            )}
          </div>
        </>
      )}

      {mode === "typing" && (
        <>
          <div className={`${flow.content} ${styles.content} ${styles.typing}`}>
            {askingLine}
            <label htmlFor="question-input" className={`${flow.label} ${styles.typingLabel}`}>
              {asking ? `What do you want to ask ${asking.name}?` : "What do you want to ask?"}
            </label>
            <textarea
              id="question-input"
              ref={inputRef}
              className={`${flow.questionXL} ${styles.input}`}
              value={text}
              rows={1}
              placeholder="What are three things…"
              onChange={(e) => setText(e.target.value.replace(/\n/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              enterKeyHint="next"
              autoCapitalize="sentences"
            />
            {!text.trim() && (
              <p className={`${styles.starters} ${flow.enterLate}`}>
                <span className={styles.startersLabel}>Start with</span>
                {STARTERS.map(([label, starter]) => (
                  <button key={label} type="button" className={styles.starter} onClick={() => applyStarter(starter)}>
                    {label}
                  </button>
                ))}
              </p>
            )}
          </div>
          <div className={flow.footer}>
            <Button block onClick={submit} disabled={!question}>
              Continue
            </Button>
          </div>
        </>
      )}
    </>
  );
}
