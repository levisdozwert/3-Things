import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  /** The microphone was refused. */
  | "denied"
  /** No microphone, or no recording support. */
  | "unavailable"
  /** Recording started, then the microphone went away or the recorder errored. */
  | "failed";

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
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockLike | null>(null);

  // Time spent recording, excluding pauses.
  const banked = useRef(0);
  const runningSince = useRef<number | null>(null);
  const elapsedMs = () => banked.current + (runningSince.current === null ? 0 : performance.now() - runningSince.current);

  const teardown = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    streamRef.current = null;
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
    analyserRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const fail = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    chunksRef.current = [];
    runningSince.current = null;
    teardown();
    setStatus("failed");
  }, [teardown]);

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
        analyser.minDecibels = -90;
        analyser.maxDecibels = -22;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        if (context.state === "suspended") void context.resume().catch(() => {});
        contextRef.current = context;
        analyserRef.current = analyser;
      } catch {
        void context.close().catch(() => {});
      }
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => fail();
      recorder.start(1000);
    } catch {
      teardown();
      setStatus("failed");
      return "failed";
    }
    recorderRef.current = recorder;

    // A microphone that disappears mid-conversation (unplugged, taken by a call) ends the recording.
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => recorderRef.current && fail();
    });

    banked.current = 0;
    runningSince.current = performance.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed(Math.floor(elapsedMs() / 1000)), 250);

    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockLike> } })
        .wakeLock;
      wakeLockRef.current = (await wakeLock?.request("screen")) ?? null;
    } catch {
      /* the screen may dim; recording continues */
    }

    setStatus("recording");
    return "recording";
  }, [fail, teardown]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    if (runningSince.current !== null) banked.current += performance.now() - runningSince.current;
    runningSince.current = null;
    setElapsed(Math.floor(elapsedMs() / 1000));
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    runningSince.current = performance.now();
    setStatus("recording");
  }, []);

  const stop = useCallback(async (): Promise<StoppedRecording> => {
    const recorder = recorderRef.current;
    const durationSec = elapsedMs() / 1000;
    recorderRef.current = null;
    runningSince.current = null;

    const blob = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === "inactive") return resolve(null);
      recorder.onerror = null;
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
    runningSince.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    chunksRef.current = [];
    teardown();
    setStatus("idle");
  }, [teardown]);

  return { status, elapsed, analyserRef, start, pause, resume, stop, discard };
}
