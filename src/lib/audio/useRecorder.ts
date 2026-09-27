import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "starting" | "recording" | "denied" | "unavailable";

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

interface WakeLockLike {
  release(): Promise<void>;
}

export interface StoppedRecording {
  blob: Blob | null;
  durationSec: number;
}

/**
 * Records from the microphone and exposes a live analyser for the listening visual.
 * Nothing here transcribes; see useSpeechRecognition for that.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockLike | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
    analyserRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  /**
   * Starts recording. Call it straight from a tap: the audio context is created
   * before the permission prompt so browsers treat it as user-initiated.
   */
  const start = useCallback(async (): Promise<RecorderStatus> => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unavailable");
      return "unavailable";
    }
    setStatus("starting");

    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
    } catch {
      /* the visual falls back to a gentle idle breath */
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      void context?.close().catch(() => {});
      const name = (error as DOMException)?.name;
      const next = name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable";
      setStatus(next);
      return next;
    }
    streamRef.current = stream;

    if (context) {
      try {
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        if (context.state === "suspended") void context.resume().catch(() => {});
        contextRef.current = context;
        analyserRef.current = analyser;
      } catch {
        void context.close().catch(() => {});
      }
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;

    startedAtRef.current = performance.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - startedAtRef.current) / 1000));
    }, 250);

    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockLike> } })
        .wakeLock;
      wakeLockRef.current = (await wakeLock?.request("screen")) ?? null;
    } catch {
      /* the screen may dim; recording continues */
    }

    setStatus("recording");
    return "recording";
  }, []);

  const stop = useCallback(async (): Promise<StoppedRecording> => {
    const recorder = recorderRef.current;
    const durationSec = startedAtRef.current ? (performance.now() - startedAtRef.current) / 1000 : 0;
    recorderRef.current = null;

    const blob = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === "inactive") return resolve(null);
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || chunks[0].type }) : null);
      };
      recorder.stop();
    });

    teardown();
    setStatus("idle");
    return { blob, durationSec };
  }, [teardown]);

  const discard = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    chunksRef.current = [];
    teardown();
    setStatus("idle");
  }, [teardown]);

  return { status, elapsed, analyserRef, start, stop, discard };
}
