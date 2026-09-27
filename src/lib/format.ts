const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const monthDayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function daysAgo(iso: string, now = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
}

/** "Sep 26", or "Sep 26, 2025" outside the current year. */
export function calendarDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() ? monthDay.format(d) : monthDayYear.format(d);
}

/** "Today", "Yesterday", or "Sep 18". */
export function relativeDay(iso: string, now = new Date()): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return calendarDate(iso, now);
}

/** 0:07, 2:14, 12:03 */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "2 min", "45 sec" */
export function duration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(1, Math.round(totalSeconds))} sec`;
  return `${Math.round(totalSeconds / 60)} min`;
}

/** "23 things", "1 person", "8 people" */
export function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Tidies a spoken or typed question: capital first letter, a question mark when it reads like one. */
export function tidyQuestion(raw: string): string {
  let q = raw.replace(/\s+/g, " ").trim();
  if (!q) return q;
  q = q.charAt(0).toUpperCase() + q.slice(1);
  if (!/[?.!]$/.test(q) && /^(what|which|who|where|when|why|how|can|could|would|should|do|does|is|are|tell)\b/i.test(q)) {
    q += "?";
  }
  return q;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** "3 Things from Alex", "Two things from Marcus", "Their 3 Things" */
export function fromLine(count: number, person: string): string {
  const who = person.trim();
  const things = count >= 3 ? "3 Things" : count === 2 ? "two things" : "one thing";
  if (!who) return `Their ${things}`;
  return `${things.charAt(0).toUpperCase()}${things.slice(1)} from ${who}`;
}
