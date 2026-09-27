import { fromLine } from "./format";
import type { SharedPoint } from "./share";
import type { Capture } from "./types";

/**
 * A clean picture of a 3 Things to share: the question, whose they are, and
 * the three headlines, with a quiet mark. Never the recording, never notes.
 */

const W = 1080;
const H = 1350;
const PAD = 96;

const COLORS = { paper: "#f8f4ec", ink: "#1c1916", ink2: "#57504a", ink3: "#776e64", line: "#e6dfd3", ember: "#c24a26" };
const SERIF = "'Fraunces Variable', 'Iowan Old Style', Georgia, serif";
const SANS = "'Instrument Sans Variable', -apple-system, 'Segoe UI', sans-serif";

function lines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Lays the card out at a scale; returns how tall it is. Draws only when asked. */
function layout(ctx: CanvasRenderingContext2D, capture: Capture, scale: number, draw: boolean): number {
  let y = PAD;
  const s = (n: number) => Math.round(n * scale);
  const text = (t: string, x: number, at: number) => draw && ctx.fillText(t, x, at);

  ctx.font = `560 ${s(32)}px ${SANS}`;
  ctx.fillStyle = COLORS.ink3;
  y += s(32);
  text(fromLine(capture.things.length, capture.person), PAD, y);
  y += s(40);

  ctx.font = `400 ${s(64)}px ${SERIF}`;
  ctx.fillStyle = COLORS.ink;
  for (const l of lines(ctx, capture.question, W - 2 * PAD)) {
    y += s(76);
    text(l, PAD, y);
  }
  y += s(52);
  if (draw) {
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(PAD, y, W - 2 * PAD, 2);
  }
  y += s(20);

  const indent = s(96);
  capture.things.forEach((thing, i) => {
    y += s(i === 0 ? 64 : 92);
    ctx.font = `400 ${s(52)}px ${SERIF}`;
    ctx.fillStyle = COLORS.ember;
    text(String(i + 1).padStart(2, "0"), PAD, y + s(8));
    ctx.font = `460 ${s(46)}px ${SERIF}`;
    ctx.fillStyle = COLORS.ink;
    lines(ctx, thing.headline, W - 2 * PAD - indent).forEach((l, j) => {
      if (j > 0) y += s(58);
      text(l, PAD + indent, y);
    });
    y += s(24);
  });
  return y;
}

/** Perspectives: the question, whose they are, then one point from each person with their name under it. */
function layoutPerspectives(
  ctx: CanvasRenderingContext2D,
  card: { question: string; names: string; points: SharedPoint[] },
  scale: number,
  draw: boolean,
): number {
  let y = PAD;
  const s = (n: number) => Math.round(n * scale);
  const text = (t: string, x: number, at: number) => draw && ctx.fillText(t, x, at);

  ctx.font = `560 ${s(32)}px ${SANS}`;
  ctx.fillStyle = COLORS.ink3;
  for (const l of lines(ctx, `Perspectives from ${card.names}`, W - 2 * PAD)) {
    y += s(40);
    text(l, PAD, y);
  }
  y += s(12);

  ctx.font = `400 ${s(60)}px ${SERIF}`;
  ctx.fillStyle = COLORS.ink;
  for (const l of lines(ctx, card.question, W - 2 * PAD)) {
    y += s(72);
    text(l, PAD, y);
  }
  y += s(48);
  if (draw) {
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(PAD, y, W - 2 * PAD, 2);
  }
  y += s(12);

  card.points.forEach((point, i) => {
    y += s(i === 0 ? 64 : 84);
    ctx.font = `460 ${s(44)}px ${SERIF}`;
    ctx.fillStyle = COLORS.ink;
    lines(ctx, point.headline, W - 2 * PAD).forEach((l, j) => {
      if (j > 0) y += s(54);
      text(l, PAD, y);
    });
    y += s(46);
    ctx.font = `600 ${s(30)}px ${SANS}`;
    ctx.fillStyle = COLORS.ember;
    text(point.name, PAD, y);
  });
  return y;
}

async function paint(fit: (ctx: CanvasRenderingContext2D, scale: number, draw: boolean) => number): Promise<Blob> {
  await Promise.all([document.fonts.load(`400 64px ${SERIF}`), document.fonts.load(`560 32px ${SANS}`)]).catch(() => []);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn’t make the picture");

  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  // Leave room at the bottom for the mark. Short answers get larger type; long ones a little smaller.
  const room = H - PAD - 140;
  const scale = [1.3, 1.2, 1.1, 1, 0.9, 0.8, 0.7, 0.62].find((k) => fit(ctx, k, false) <= room) ?? 0.55;
  fit(ctx, scale, true);

  // The mark: three strokes, then the name, quietly.
  const base = H - PAD;
  [26, 40, 32].forEach((h, i) => {
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.roundRect(PAD + i * 14, base - h, 8, h, 4);
    ctx.fill();
  });
  ctx.font = `400 36px ${SERIF}`;
  ctx.fillStyle = COLORS.ink2;
  ctx.fillText("3 Things", PAD + 56, base - 4);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t make the picture"))), "image/png"),
  );
}

export function renderShareCard(capture: Capture): Promise<Blob> {
  return paint((ctx, scale, draw) => layout(ctx, capture, scale, draw));
}

export function renderPerspectivesCard(card: { question: string; names: string; points: SharedPoint[] }): Promise<Blob> {
  return paint((ctx, scale, draw) => layoutPerspectives(ctx, card, scale, draw));
}
