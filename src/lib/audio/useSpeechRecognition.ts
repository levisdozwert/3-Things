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
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
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

/** Errors that mean speech recognition can't work here, as opposed to a quiet moment. */
export const BLOCKING_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

interface Options {
  /** Keep listening through pauses (the answer) rather than stopping at the first one (the question). */
  continuous: boolean;
  lang?: string;
}

const join = (...parts: string[]) => parts.join(" ").replace(/\s+/g, " ").trim();

/**
 * Speech to text in the browser.
 *
 * Neither the question nor the answer is shown word by word while someone
 * speaks. The question is shown once, afterwards, so the asker can check it.
 * The answer is collected quietly and only ever used to find the three things.
 */
export function useSpeechRecognition({ continuous, lang }: Options) {
  const [listening, setListening] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const endWaitersRef = useRef<(() => void)[]>([]);

  const settle = useCallback(() => {
    recognitionRef.current = null;
    setListening(false);
    setHearing(false);
    endWaitersRef.current.splice(0).forEach((resolve) => resolve());
  }, []);

  const begin = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang || navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current = join(finalRef.current, result[0].transcript);
        else interim += result[0].transcript;
      }
      interimRef.current = interim.trim();
      setHearing(true);
      setText(join(finalRef.current, interimRef.current));
    };
    recognition.onspeechstart = () => setHearing(true);
    recognition.onspeechend = () => setHearing(false);

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(event.error);
      if (BLOCKING_ERRORS.has(event.error)) wantRef.current = false;
    };

    recognition.onend = () => {
      if (interimRef.current) {
        finalRef.current = join(finalRef.current, interimRef.current);
        interimRef.current = "";
        setText(finalRef.current);
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
      wantRef.current = false;
      settle();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      return true;
    } catch {
      recognitionRef.current = null;
      setListening(false);
      return false;
    }
  }, [continuous, lang, settle]);

  /** Starts fresh. Returns false when speech recognition isn't available. */
  const start = useCallback(() => {
    if (!getCtor()) return false;
    recognitionRef.current?.abort();
    finalRef.current = "";
    interimRef.current = "";
    setText("");
    setError(null);
    wantRef.current = true;
    return begin();
  }, [begin]);

  const halt = useCallback(async () => {
    wantRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) return;
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
  }, []);

  /** Stops listening and resolves with everything heard, including words not yet finalized. */
  const stop = useCallback(async (): Promise<string> => {
    await halt();
    return join(finalRef.current, interimRef.current);
  }, [halt]);

  /** Stops for now, keeping what was heard. */
  const pause = useCallback(() => {
    void halt();
  }, [halt]);

  /** Carries on after a pause, adding to what was heard. */
  const resume = useCallback(() => {
    if (!getCtor()) return;
    wantRef.current = true;
    // If the paused session is still winding down, its end handler restarts it.
    if (!recognitionRef.current) begin();
  }, [begin]);

  const abort = useCallback(() => {
    wantRef.current = false;
    recognitionRef.current?.abort();
    settle();
  }, [settle]);

  useEffect(
    () => () => {
      wantRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported: speechSupported, listening, hearing, text, error, start, stop, pause, resume, abort };
}
