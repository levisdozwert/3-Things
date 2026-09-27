import { calendarDate, daysAgo } from "../format";
import { speakerLabel } from "../people";
import type { Outgoing, PersonRecord } from "../types";

/** Who a question went to, by their current name. */
export function sentTo(question: Outgoing, people: PersonRecord[]): string {
  if (question.speakers.length === 0) return "";
  return speakerLabel(question.speakers, people) || question.person;
}

/** "Sent today", "Sent yesterday", "Sent 3 days ago", "Sent Sep 12". */
export function sentWhen(iso: string, now = new Date()): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return "Sent today";
  if (days === 1) return "Sent yesterday";
  if (days < 7) return `Sent ${days} days ago`;
  return `Sent ${calendarDate(iso, now)}`;
}

/** Sent, opened, answered: that's all anyone needs to know. No times, no read receipts. */
export function stateLabel(question: Outgoing): string {
  return question.state === "answered" ? "Answered" : question.state === "opened" ? "Opened" : "Waiting";
}

/** Still waiting on someone (or, for a link anyone can answer, on anyone at all). */
export function isWaiting(question: Outgoing): boolean {
  return question.state !== "answered";
}
