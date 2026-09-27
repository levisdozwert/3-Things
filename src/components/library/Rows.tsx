import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { relativeDay, sourceLine } from "../../lib/format";
import { matchesAll, matchesAny, type Person, type Topic } from "../../lib/library";
import type { Capture, Thing } from "../../lib/types";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { Highlight } from "./Highlight";
import styles from "./Library.module.css";

function conversationMeta(capture: Capture, { topic = true, place = true } = {}) {
  return [topic ? capture.topic : null, place ? capture.place : null, relativeDay(capture.recordedAt)]
    .filter(Boolean)
    .join(" · ");
}

interface ConversationRowProps {
  capture: Capture;
  terms?: string[];
  /** Lead with who said it (Recent, Topics, search). Off on a person's own page. */
  showPerson?: boolean;
  /** A quiet label above the question, e.g. the topic on a person's page. */
  eyebrow?: string;
  /** Show the three headlines underneath, compactly. */
  showThings?: boolean;
  /** Leave the topic out of the quiet line, e.g. on that topic's own page. */
  showTopic?: boolean;
}

/** One conversation: person, question, then quiet context. */
export function ConversationRow({
  capture,
  terms,
  showPerson = true,
  eyebrow,
  showThings = false,
  showTopic = true,
}: ConversationRowProps) {
  const person = capture.person.trim();
  return (
    <li>
      <Link to={`/library/${capture.id}`} viewTransition className={styles.row}>
        {showPerson && (
          <div className={styles.who}>
            <Avatar name={person} size="sm" />
            <span className={person ? styles.person : styles.unnamed}>
              {person ? <Highlight text={person} terms={terms} /> : sourceLine("")}
            </span>
            {capture.keptClose && (
              <span className={styles.kept} title="Kept close">
                <Icon name="bookmarked" size={16} strokeWidth={1.6} />
                <span className="visually-hidden">Kept close</span>
              </span>
            )}
          </div>
        )}
        {eyebrow && (
          <p className={styles.eyebrow}>
            {eyebrow}
            {!showPerson && capture.keptClose && (
              <span className={styles.keptInline}>
                <Icon name="bookmarked" size={14} strokeWidth={1.6} />
                <span className="visually-hidden">Kept close</span>
              </span>
            )}
          </p>
        )}
        <p
          className={`serif ${styles.question}`}
          style={{ viewTransitionName: `question-${capture.id}` } as CSSProperties}
        >
          <Highlight text={capture.question} terms={terms} />
        </p>
        {showThings && (
          <ol className={styles.things}>
            {capture.things.map((t, i) => (
              <li key={t.id}>
                <span className="serif tabular">{i + 1}</span>
                <span>{t.headline}</span>
              </li>
            ))}
          </ol>
        )}
        <p className={styles.meta}>{conversationMeta(capture, { topic: showTopic && !eyebrow })}</p>
      </Link>
    </li>
  );
}

interface PersonRowProps {
  person: Person;
  terms?: string[];
  /** Instead of the usual counts, e.g. "Told you 3 things about Boston". */
  note?: string;
}

/** Someone the user has learned from. Not a profile: just what they've shared. */
export function PersonRow({ person, terms, note }: PersonRowProps) {
  const conversations = person.conversations.length;
  // What they talk about, and where: "Travel · Food · Boston".
  const context = person.places.length > 0 ? [...person.topics.slice(0, 2), person.places[0]] : person.topics.slice(0, 3);
  return (
    <li>
      <Link to={`/library/people/${encodeURIComponent(person.key)}`} viewTransition className={styles.personRow}>
        <Avatar name={person.name} size="md" />
        <div className={styles.personText}>
          <p className={`serif ${styles.personName}`}>
            <Highlight text={person.name} terms={terms} />
          </p>
          <p className={styles.counts}>
            {note ??
              `${conversations} ${conversations === 1 ? "conversation" : "conversations"} · ${person.things} ${
                person.things === 1 ? "thing" : "things"
              }`}
          </p>
          {context.length > 0 && <p className={styles.topicsLine}>{context.join(" · ")}</p>}
        </div>
        <Icon name="forward" size={18} className={styles.chevron} />
      </Link>
    </li>
  );
}

/** "Jason", "Jason and Maya", "Jason, Maya and Carlos", "Jason, Maya and 3 others" */
function names(people: string[]): string {
  if (people.length <= 1) return people.join("");
  if (people.length <= 3) return `${people.slice(0, -1).join(", ")} and ${people[people.length - 1]}`;
  return `${people.slice(0, 2).join(", ")} and ${people.length - 2} others`;
}

/** A subject that emerged from what the user asked, and who spoke to it. */
export function TopicRow({ topic }: { topic: Topic }) {
  const n = topic.conversations.length;
  return (
    <li>
      <Link to={`/library/topics/${encodeURIComponent(topic.key)}`} viewTransition className={styles.topicRow}>
        <div>
          <p className={`serif ${styles.topicName}`}>{topic.name}</p>
          <p className={styles.counts}>
            {n} {n === 1 ? "conversation" : "conversations"}
            {topic.people.length > 0 && ` · ${names(topic.people)}`}
          </p>
        </div>
        <Icon name="forward" size={18} className={styles.chevron} />
      </Link>
    </li>
  );
}

interface ThingRowProps {
  capture: Capture;
  thing: Thing;
  terms?: string[];
}

/** A single thing someone said, never without who said it and what was asked. */
export function ThingRow({ capture, thing, terms }: ThingRowProps) {
  const person = capture.person.trim();
  // When the match is in what they explained rather than the headline, show why it came up.
  const unexplained = terms?.filter((t) => !matchesAll(thing.headline, [t])) ?? [];
  const why = thing.detail && unexplained.length > 0 && matchesAny(thing.detail, unexplained) ? thing.detail : null;
  return (
    <li>
      <Link to={`/library/${capture.id}`} state={{ focus: thing.id }} viewTransition className={styles.thingRow}>
        <p className={`serif ${styles.thingHeadline}`}>
          <Highlight text={thing.headline} terms={terms} />
        </p>
        {why && (
          <p className={styles.thingDetail}>
            <Highlight text={why} terms={terms} />
          </p>
        )}
        <p className={styles.source}>
          <Avatar name={person} size="xs" />
          <span className={styles.sourceName}>{sourceLine(person)}</span>
          <span className={styles.sourceQuestion}>
            <Highlight text={capture.question} terms={terms} />
          </span>
        </p>
      </Link>
    </li>
  );
}
