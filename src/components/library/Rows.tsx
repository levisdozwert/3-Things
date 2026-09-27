import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { relativeDay, sourceLine } from "../../lib/format";
import { matchesAll, type Person, type Topic } from "../../lib/library";
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
}

/** One conversation: person, question, then quiet context. */
export function ConversationRow({ capture, terms, showPerson = true, eyebrow, showThings = false }: ConversationRowProps) {
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
        <p className={styles.meta}>{conversationMeta(capture, { topic: !eyebrow })}</p>
      </Link>
    </li>
  );
}

interface PersonRowProps {
  person: Person;
  terms?: string[];
  /** Instead of the usual counts, e.g. "Mentioned in 2 conversations". */
  note?: string;
}

/** Someone the user has learned from. Not a profile: just what they've shared. */
export function PersonRow({ person, terms, note }: PersonRowProps) {
  const conversations = person.conversations.length;
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
          {person.topics.length > 0 && <p className={styles.topicsLine}>{person.topics.slice(0, 3).join(" · ")}</p>}
        </div>
        <Icon name="forward" size={18} className={styles.chevron} />
      </Link>
    </li>
  );
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
            {topic.people.length > 0 && ` · ${topic.people.slice(0, 3).join(", ")}${topic.people.length > 3 ? "…" : ""}`}
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
  const why = terms?.length && thing.detail && !matchesAll(thing.headline, terms) ? thing.detail : null;
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
          <span className={styles.sourceQuestion}>{capture.question}</span>
        </p>
      </Link>
    </li>
  );
}
