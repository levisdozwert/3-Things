import { newId } from "../format";
import { isNew, labelFor } from "../people";
import type { Capture, Outgoing, PersonRecord, Speaker } from "../types";
import type { ReceivedAnswer } from "./contract";

/** One answer, one conversation, however many times the app checks. */
export const captureIdFor = (answer: ReceivedAnswer) => `remote-${answer.id}`;

/**
 * An answer becomes an ordinary conversation in the asker's Library,
 * attributed to whoever answered, exactly as they reviewed and sent it.
 * A name that isn't anyone yet becomes a person now: people exist because
 * of a conversation. Several answers to one question stay separate.
 */
export function receive(
  outgoing: Outgoing,
  answers: ReceivedAnswer[],
  people: PersonRecord[],
  now = new Date(),
): { captures: Capture[]; people: PersonRecord[]; speakers: Speaker[] } {
  const records = [...people];
  let speakers = outgoing.speakers;

  const person = (name: string) => {
    const record: PersonRecord = { id: `person-${newId()}`, name: name.trim() || "Someone", createdAt: now.toISOString() };
    records.push(record);
    return record.id;
  };

  const captures = answers.map((answer): Capture => {
    let ids: string[];
    if (speakers.length > 0) {
      ids = speakers.map((s) =>
        !isNew(s) && records.some((p) => p.id === s.id) ? s.id : person(isNew(s) ? s.name : outgoing.person || answer.name),
      );
      speakers = ids.map((id) => ({ id }));
    } else {
      // A link for anyone: they told us what to call them.
      ids = [person(answer.name)];
    }
    return {
      id: captureIdFor(answer),
      question: outgoing.question,
      person: labelFor(ids.map((id) => records.find((p) => p.id === id)?.name ?? "")),
      personIds: ids,
      topic: answer.topic || "Life",
      ...(answer.place ? { place: answer.place } : {}),
      things: answer.things.map((t) => ({
        id: newId(),
        headline: t.headline,
        detail: t.detail,
        ...(t.said ? { said: t.said } : {}),
      })),
      recordedAt: answer.answeredAt,
      durationSec: Math.round(answer.durationSec),
      hasAudio: false,
      origin: "recording",
      remote: { sentAt: outgoing.sentAt, answeredAt: answer.answeredAt },
      unseen: true,
      // One question, however many people it went to: each answer stays its own.
      group: outgoing.group,
    };
  });

  return { captures, people: records, speakers };
}
