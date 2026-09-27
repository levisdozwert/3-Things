import { describe, expect, it } from "vitest";
import { bandLevels, isSpeaking, simulatedVoice, type Three } from "../src/lib/audio/voice";

const BIN_HZ = 46.875; // 48 kHz / 1024

/** A spectrum with `level` (0–255) between two frequencies and `floor` elsewhere. */
function spectrum(from: number, to: number, level: number, floor = 40): number[] {
  return Array.from({ length: 512 }, (_, i) => (i * BIN_HZ >= from && i * BIN_HZ <= to ? level : floor));
}

function settle(freq: number[], floors: Three, frames = 30) {
  let out: Three = [0, 0, 0];
  for (let i = 0; i < frames; i++) out = bandLevels(freq, BIN_HZ, floors);
  return out;
}

describe("bandLevels", () => {
  it("settles to rest in a steady quiet room", () => {
    const floors: Three = [1, 1, 1];
    const levels = settle(spectrum(0, 0, 0, 60), floors);
    expect(Math.max(...levels)).toBeLessThan(0.05);
    expect(isSpeaking(levels)).toBe(false);
  });

  it("lifts the matching form when a voice appears in its band", () => {
    const floors: Three = [1, 1, 1];
    settle(spectrum(0, 0, 0, 40), floors);
    const vowels = bandLevels(spectrum(320, 1300, 180), BIN_HZ, floors);
    expect(vowels[1]).toBeGreaterThan(vowels[0]);
    expect(vowels[1]).toBeGreaterThan(vowels[2]);
    expect(isSpeaking(vowels)).toBe(true);
  });

  it("stays within 0 and 1", () => {
    const floors: Three = [0, 0, 0];
    const levels = bandLevels(spectrum(0, 24000, 255), BIN_HZ, floors);
    for (const level of levels) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });
});

describe("simulatedVoice", () => {
  it("has phrases and pauses, like someone talking", () => {
    const samples = Array.from({ length: 600 }, (_, i) => isSpeaking(simulatedVoice(i * 0.05)));
    expect(samples.some(Boolean)).toBe(true);
    expect(samples.some((s) => !s)).toBe(true);
  });
});
