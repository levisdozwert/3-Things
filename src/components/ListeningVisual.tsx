import { useEffect, useRef, type RefObject } from "react";
import { createVoiceMeter, isSpeaking, readVoice, simulatedVoice, type Three } from "../lib/audio/voice";

interface ListeningVisualProps {
  analyserRef?: RefObject<AnalyserNode | null>;
  /** Move with a stand-in voice when no microphone is in use (preview). */
  simulate?: boolean;
  paused?: boolean;
  /** Called when someone starts or stops speaking (with a little patience for breaths). */
  onSpeakingChange?: (speaking: boolean) => void;
  size?: number;
}

const EMBER = "194, 74, 38";
/** At rest the forms take the proportions of the 3 Things mark: short, tall, medium. */
const REST: Three = [0.2, 0.34, 0.27];
const PEAK: Three = [0.78, 0.96, 0.86];
const WIDTH = 0.094;
const GAP = 0.1;
/** A breath between words shouldn't count as silence. */
const SPEAKING_HOLD_MS = 900;

/**
 * Three vertical forms that listen.
 *
 * Each follows its own part of the voice (warmth, vowels, detail), on a soft
 * spring, so speech moves them unevenly the way a real voice does. In silence
 * they settle into the 3 Things mark and breathe. Nothing here looks like a
 * waveform editor, and nothing suggests words are being counted.
 */
export function ListeningVisual({
  analyserRef,
  simulate = false,
  paused = false,
  onSpeakingChange,
  size = 232,
}: ListeningVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const speakingCallback = useRef(onSpeakingChange);
  pausedRef.current = paused;
  speakingCallback.current = onSpeakingChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const meter = createVoiceMeter();
    const width = size * WIDTH;
    const gap = size * GAP;
    const left = (size - (width * 3 + gap * 2)) / 2;

    const height = REST.map((r) => r * size) as Three;
    const velocity: Three = [0, 0, 0];
    let alpha = 1;
    let lastVoice = -Infinity;
    let speaking = false;
    let frame = 0;
    let last = performance.now();
    const t0 = last;

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = (now - t0) / 1000;
      const isPaused = pausedRef.current;

      const analyser = analyserRef?.current;
      const bands: Three = isPaused
        ? [0, 0, 0]
        : analyser
          ? readVoice(analyser, meter)
          : simulate
            ? simulatedVoice(t)
            : [0, 0, 0];

      if (!isPaused && isSpeaking(bands)) lastVoice = now;
      const nowSpeaking = now - lastVoice < SPEAKING_HOLD_MS;
      if (nowSpeaking !== speaking) {
        speaking = nowSpeaking;
        speakingCallback.current?.(speaking);
      }

      const overall = (bands[0] + bands[1] + bands[2]) / 3;
      const stiffness = reduce ? 220 : 150;
      const damping = reduce ? 30 : 16;

      ctx!.clearRect(0, 0, size, size);
      alpha += ((isPaused ? 0.32 : 1) - alpha) * Math.min(1, dt * 6);
      ctx!.fillStyle = `rgba(${EMBER}, ${alpha})`;

      for (let i = 0; i < 3; i++) {
        const level = Math.min(1, bands[i] * 0.62 + overall * 0.5);
        const breath = reduce || isPaused ? 0 : Math.sin(t * ((Math.PI * 2) / 4.4) + i * 0.9) * size * 0.012;
        const target = (REST[i] + level * (PEAK[i] - REST[i])) * size + breath;

        const accel = stiffness * (target - height[i]) - damping * velocity[i];
        velocity[i] += accel * dt;
        height[i] += velocity[i] * dt;
        const h = Math.max(width, Math.min(size, height[i]));

        const x = left + i * (width + gap);
        const y = (size - h) / 2;
        ctx!.beginPath();
        ctx!.roundRect(x, y, width, h, width / 2);
        ctx!.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyserRef, simulate, size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={paused ? "Paused" : "Listening"}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
