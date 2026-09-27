import { useEffect, useRef, type RefObject } from "react";

interface ListeningVisualProps {
  analyserRef?: RefObject<AnalyserNode | null>;
  /** Breathe with a synthetic voice when no microphone is in use (preview). */
  simulate?: boolean;
  size?: number;
}

const EMBER = "194, 74, 38";
const HALOS = 3;

function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * A warm presence that breathes while someone talks.
 *
 * One ember core and three soft halos. The halos follow the voice with a little
 * lag each, so sound ripples outward, and their edges drift with a faint
 * three-lobed wobble. In silence it keeps breathing, so it never looks dead.
 * Deliberately not a waveform: nothing here suggests words are being counted.
 */
export function ListeningVisual({ analyserRef, simulate = false, size = 300 }: ListeningVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const c = size / 2;
    const core = size * 0.17;
    const step = size * 0.085;
    const levels = new Array(HALOS + 1).fill(0);
    let buffer: Float32Array<ArrayBuffer> | null = null;
    let frame = 0;
    const t0 = performance.now();

    function voiceLevel(t: number): number {
      const analyser = analyserRef?.current;
      if (analyser) {
        if (!buffer || buffer.length !== analyser.fftSize) buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        return clamp(Math.sqrt(rms) * 2.4 - 0.14);
      }
      if (simulate) {
        // Phrases of speech with natural pauses between them.
        const phrase = (Math.sin(t * 0.55) + Math.sin(t * 0.23 + 1.7)) * 0.5;
        const speaking = phrase > -0.35 ? 1 : 0;
        const syllables = 0.5 + 0.5 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 0.4);
        return clamp(speaking * (0.25 + syllables * 0.45));
      }
      return 0;
    }

    function blob(radius: number, wobble: number, t: number, seed: number) {
      ctx!.beginPath();
      const points = 72;
      for (let p = 0; p <= points; p++) {
        const a = (p / points) * Math.PI * 2;
        const r =
          radius +
          wobble * (Math.sin(3 * a + t * 0.9 + seed * 1.3) * 0.62 + Math.sin(2 * a - t * 0.65 + seed) * 0.38);
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        if (p === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
    }

    function draw(now: number) {
      const t = (now - t0) / 1000;
      const target = voiceLevel(t);

      // Each halo follows the one inside it, so sound travels outward.
      for (let i = 0; i <= HALOS; i++) {
        const source = i === 0 ? target : levels[i - 1];
        const rate = source > levels[i] ? 0.32 - i * 0.05 : 0.05 - i * 0.008;
        levels[i] += (source - levels[i]) * rate;
      }

      ctx!.clearRect(0, 0, size, size);

      for (let i = HALOS; i >= 1; i--) {
        const breath = (Math.sin(t * ((Math.PI * 2) / 4.6) - i * 0.7) + 1) / 2;
        const radius = core + i * step + breath * 3 + levels[i] * (6 + i * 6);
        const wobble = reduce ? 0 : 1 + levels[i] * 3.4;
        blob(radius, wobble, t, i);
        ctx!.fillStyle = `rgba(${EMBER}, ${[0, 0.15, 0.095, 0.06][i]})`;
        ctx!.fill();
      }

      const coreBreath = (Math.sin(t * ((Math.PI * 2) / 4.6)) + 1) / 2;
      const coreRadius = core * (1 + coreBreath * 0.018 + levels[0] * 0.07);
      const gradient = ctx!.createRadialGradient(c - coreRadius * 0.3, c - coreRadius * 0.35, 0, c, c, coreRadius);
      gradient.addColorStop(0, "rgb(214, 99, 64)");
      gradient.addColorStop(1, `rgb(${EMBER})`);
      blob(coreRadius, reduce ? 0 : 0.6 + levels[0] * 1.6, t, 0);
      ctx!.fillStyle = gradient;
      ctx!.fill();

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyserRef, simulate, size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Listening"
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
