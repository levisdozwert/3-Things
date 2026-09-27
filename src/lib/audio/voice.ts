/**
 * Turns live microphone data into three gentle levels, one per 3 Things form.
 *
 * The forms follow the voice, not the room: each band keeps its own slowly
 * adapting noise floor, so a humming fridge settles to rest and a person
 * speaking lifts all three, each a little differently.
 */

export type Three = [number, number, number];

/** Speech lives roughly here: warmth, vowels, and consonant detail. */
const BANDS: [number, number][] = [
  [90, 320],
  [320, 1300],
  [1300, 4200],
];

const GAIN: Three = [2.6, 2.8, 3.6];
/** Above this, a band counts as someone speaking. */
export const SPEAKING_THRESHOLD = 0.2;

export interface VoiceMeter {
  floors: Three;
  freq: Uint8Array<ArrayBuffer> | null;
}

export function createVoiceMeter(): VoiceMeter {
  return { floors: [1, 1, 1], freq: null };
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Levels (0–1) for the three bands of a frequency spectrum, relative to the
 * noise floor each band has settled to. Mutates `floors`.
 */
export function bandLevels(freq: ArrayLike<number>, binHz: number, floors: Three): Three {
  const out: Three = [0, 0, 0];
  for (let b = 0; b < 3; b++) {
    const [lo, hi] = BANDS[b];
    const from = Math.max(1, Math.floor(lo / binHz));
    const to = Math.min(freq.length - 1, Math.ceil(hi / binHz));
    let sum = 0;
    for (let i = from; i <= to; i++) sum += freq[i] / 255;
    const energy = to >= from ? sum / (to - from + 1) : 0;
    // The floor drops to quiet moments quickly and drifts up slowly.
    floors[b] = energy < floors[b] ? floors[b] + (energy - floors[b]) * 0.2 : floors[b] + 0.0006;
    out[b] = clamp((energy - floors[b]) * GAIN[b]);
  }
  return out;
}

/** Reads the analyser once. Returns levels for the three forms. */
export function readVoice(analyser: AnalyserNode, meter: VoiceMeter): Three {
  if (!meter.freq || meter.freq.length !== analyser.frequencyBinCount) {
    meter.freq = new Uint8Array(analyser.frequencyBinCount);
  }
  analyser.getByteFrequencyData(meter.freq);
  const binHz = analyser.context.sampleRate / analyser.fftSize;
  return bandLevels(meter.freq, binHz, meter.floors);
}

/**
 * A believable stand-in voice for previews without a microphone: phrases with
 * natural pauses, syllables inside them, and slightly different movement per band.
 */
export function simulatedVoice(t: number): Three {
  const phrase = (Math.sin(t * 0.55) + Math.sin(t * 0.23 + 1.7)) * 0.5;
  if (phrase < -0.35) return [0, 0, 0];
  const syllable = (rate: number, offset: number) => 0.5 + 0.5 * Math.sin(t * rate + offset) * Math.sin(t * 3.1 + offset);
  return [
    clamp(0.2 + syllable(6.3, 0) * 0.45),
    clamp(0.25 + syllable(8.9, 1.1) * 0.55),
    clamp(0.1 + syllable(11.7, 2.3) * 0.5),
  ];
}

export function isSpeaking(levels: Three): boolean {
  return Math.max(levels[0], levels[1], levels[2]) > SPEAKING_THRESHOLD;
}
