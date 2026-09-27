import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { tidyQuestion } from "../../lib/format";
import flow from "./Flow.module.css";
import styles from "./AskStep.module.css";

const STARTERS = [
  ["Three things…", "What are three things"],
  ["Three places…", "What are three places"],
  ["Three mistakes…", "What are three mistakes"],
  ["Three books…", "What are three books"],
];

interface AskStepProps {
  initialMode: "voice" | "type";
  initialText: string;
  onContinue: (question: string) => void;
  onClose: () => void;
}

/** Capture the question — spoken or typed — in as few seconds as possible. */
export function AskStep({ initialMode, initialText, onContinue, onClose }: AskStepProps) {
  const speech = useSpeechRecognition({ continuous: false });
  const [mode, setMode] = useState<"voice" | "type">(speech.supported ? initialMode : "type");
  const [text, setText] = useState(initialText);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { start: startSpeech, abort: abortSpeech } = speech;

  useEffect(() => {
    if (mode !== "voice") return;
    startSpeech();
    return () => abortSpeech();
  }, [mode, startSpeech, abortSpeech]);

  useEffect(() => {
    if (mode === "voice" && speech.text) setText(speech.text);
  }, [mode, speech.text]);

  useEffect(() => {
    if (!speech.error || mode !== "voice") return;
    if (["not-allowed", "service-not-allowed", "audio-capture", "network"].includes(speech.error)) {
      setNotice(
        speech.error === "network"
          ? "Speech isn't available right now, so type it instead."
          : "The microphone isn't available, so type it instead.",
      );
      setMode("type");
    }
  }, [speech.error, mode]);

  useEffect(() => {
    if (mode !== "type") return;
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

  const question = tidyQuestion(text);
  const submit = () => {
    if (!question) return;
    abortSpeech();
    onContinue(question);
  };

  const switchTo = (next: "voice" | "type") => {
    abortSpeech();
    setNotice(null);
    if (next === "voice") setText("");
    setMode(next);
  };

  const applyStarter = (starter: string) => {
    setText(`${starter} `);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Close" onClick={onClose} />
        {mode === "voice" ? (
          <Button variant="text" size="sm" icon="keyboard" onClick={() => switchTo("type")}>
            Type instead
          </Button>
        ) : (
          speech.supported && (
            <Button variant="text" size="sm" icon="mic" onClick={() => switchTo("voice")}>
              Say it instead
            </Button>
          )
        )}
      </div>

      {mode === "voice" ? (
        <div className={`${flow.content} ${styles.voice}`}>
          <p className={`${flow.label} ${flow.enter}`}>
            {speech.listening ? "Say your question" : text ? "Your question" : "Tap the microphone to say your question"}
          </p>
          <button
            type="button"
            className={`${styles.spoken} ${flow.enter}`}
            onClick={() => text && switchTo("type")}
            aria-label={text ? `${text}. Tap to edit.` : undefined}
            tabIndex={text ? 0 : -1}
          >
            {text ? (
              <span className={`${flow.question} ${flow.questionXL}`}>
                {speech.listening ? speech.finalText : text}
                {speech.listening && speech.interimText && (
                  <span className={styles.interim}> {speech.interimText}</span>
                )}
              </span>
            ) : (
              <span className={`serif ${flow.questionXL} ${styles.placeholder}`}>What are three things…</span>
            )}
          </button>
          {text && !speech.listening && <p className={styles.editHint}>Tap your question to edit it</p>}
        </div>
      ) : (
        <div className={`${flow.content} ${styles.typed}`}>
          <label htmlFor="question-input" className={`${flow.label} ${flow.enter}`}>
            What do you want to ask?
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
          {notice && <p className={styles.notice}>{notice}</p>}
          {!text.trim() && (
            <div className={`${styles.starters} ${flow.enterLate}`}>
              <span className={styles.startersLabel}>Start with</span>
              {STARTERS.map(([label, starter]) => (
                <button key={label} type="button" className={styles.starter} onClick={() => applyStarter(starter)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={flow.footer}>
        {mode === "voice" ? (
          <div className={styles.voiceControls}>
            <button
              type="button"
              className={`${styles.mic} ${speech.listening ? styles.micLive : ""}`}
              onClick={() => (speech.listening ? void speech.stop() : startSpeech())}
              aria-label={speech.listening ? "Done speaking" : "Say it again"}
            >
              <span className={styles.micRing} aria-hidden="true" />
              <Icon name={speech.listening ? "check" : "mic"} size={28} strokeWidth={1.8} />
            </button>
            {!speech.listening && question ? (
              <Button block onClick={submit}>
                Continue
              </Button>
            ) : (
              <p className={styles.micHint}>{speech.listening ? "Listening. Tap when you're done." : "Tap to speak"}</p>
            )}
          </div>
        ) : (
          <Button block onClick={submit} disabled={!question}>
            Continue
          </Button>
        )}
      </div>
    </>
  );
}
