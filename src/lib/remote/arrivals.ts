import { listOf } from "../format";
import type { Arrival } from "./useRemoteSync";

export interface Notice {
  title: string;
  line: string;
  to: string;
  name: string;
  /** Where it points, so it never sits over the page it's about. */
  captureId: string;
}

/**
 * What to say when answers arrive. One notice however many came back at once,
 * and never one for anything less than an answer. When several people have
 * answered the same question, it says how many perspectives there are now.
 */
export function describeArrivals(arrivals: Arrival[], answersBefore: (group: string) => number): Notice {
  const latest = arrivals[arrivals.length - 1];
  const names = [...new Set(arrivals.map((a) => a.name))];
  const together = arrivals.filter((a) => a.group === latest.group).length;
  const perspectives = answersBefore(latest.group) + together;
  const about = latest.place ? `your ${latest.place} question` : `“${latest.question}”`;
  if (perspectives >= 2) {
    return {
      title: names.length === 1 ? `${latest.name} sent their 3` : `${listOf(names)} answered`,
      line: `You now have ${perspectives} perspectives on ${about}`,
      to: `/library/questions/${encodeURIComponent(latest.group)}`,
      name: latest.name,
      captureId: latest.captureId,
    };
  }
  return {
    title: names.length === 1 ? `${latest.name} answered your question` : `${listOf(names)} answered`,
    line: latest.question,
    to: `/library/${latest.captureId}`,
    name: latest.name,
    captureId: latest.captureId,
  };
}

