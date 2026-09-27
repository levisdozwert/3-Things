import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API, which TypeScript's DOM lib doesn't ship. */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = getCtor() !== null;

const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

interface Options {
  /** Keep listening through pauses (the answer) rather than stopping at the first one (the question). */
  continuous: boolean;
  lang?: string;
}

/**
 * Speech to text in the browser.
 *
 * For the question, the words are shown as the user speaks — it's their own sentence.
 * For the answer, the transcript is collected quietly and only ever used to find the
 * three things. The listening screen never shows it.
 */
export function useSpeechRecognition({ continuous, lang }: Options) {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const endWaitersRef = useRef<(() => void)[]>([]);

  const begin = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang || navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${text}`.replace(/\s+/g, " ").trim();
        } else {
          interim += text;
        }
      }
      interimRef.current = interim.trim();
      setFinalText(finalRef.current);
      setInterimText(interimRef.current);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(event.error);
      if (FATAL.has(event.error)) wantRef.current = false;
    };

    recognition.onend = () => {
      if (interimRef.current) {
        finalRef.current = `${finalRef.current} ${interimRef.current}`.trim();
        interimRef.current = "";
        setFinalText(finalRef.current);
        setInterimText("");
      }
      // Browsers end recognition after silence or a time limit. Keep going while asked to.
      if (wantRef.current && continuous) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through to a clean end */
        }
      }
      recognitionRef.current = null;
      wantRef.current = false;
      setListening(false);
      endWaitersRef.current.splice(0).forEach((resolve) => resolve());
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, [continuous, lang]);

  const start = useCallback(() => {
    if (!getCtor()) return false;
    recognitionRef.current?.abort();
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterimText("");
    setError(null);
    wantRef.current = true;
    begin();
    return true;
  }, [begin]);

  /** Stops listening and resolves with everything heard, including words not yet finalized. */
  const stop = useCallback(async (): Promise<string> => {
    wantRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      await Promise.race([
        new Promise<void>((resolve) => {
          endWaitersRef.current.push(resolve);
          try {
            recognition.stop();
          } catch {
            resolve();
          }
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
    return `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, " ").trim();
  }, []);

  const abort = useCallback(() => {
    wantRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return {
    supported: speechSupported,
    listening,
    text: `${finalText} ${interimText}`.trim(),
    finalText,
    interimText,
    error,
    start,
    stop,
    abort,
  };
}
