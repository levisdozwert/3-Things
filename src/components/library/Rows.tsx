import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { relativeDay, sourceLine } from "../../lib/format";
import { matchesAll, matchesAny, type Person, type Topic } from "../../lib/library";
import { namesOf, perspectivesLine, type QuestionCollection } from "../../lib/questions";
import { useStore } from "../../lib/store";
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

/** The photo the user chose for whoever a conversation is from, when it's one person. */
function usePhotoOf(capture: Capture): string | undefined {
  const { getPerson } = useStore();
  const ids = capture.personIds ?? [];
  return ids.length === 1 ? getPerson(ids[0])?.photo : undefined;
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
  const photo = usePhotoOf(capture);
  return (
    <li>
      <Link to={`/library/${capture.id}`} viewTransition className={styles.row}>
        {showPerson && (
          <div className={styles.who}>
            <Avatar name={person} photo={photo} size="sm" />
            <span className={person ? styles.person : styles.unnamed}>
              {person ? <Highlight text={person} terms={terms} /> : sourceLine("")}
            </span>
            {capture.unseen && <span className={styles.fresh}>New</span>}
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

/**
 * A question several people answered: it reads as one question with several
 * perspectives, and opens to each of them. Their answers are still their own.
 */
export function QuestionRow({ question, terms }: { question: QuestionCollection; terms?: string[] }) {
  const { getPerson } = useStore();
  const answers = question.answers;
  const latest = answers[answers.length - 1]?.recordedAt ?? question.latest;
  return (
    <li>
      <Link to={`/library/questions/${encodeURIComponent(question.key)}`} viewTransition className={styles.row}>
        <div className={styles.who}>
          <span className={styles.faces} aria-hidden="true">
            {answers.slice(0, 4).map((c) => (
              <Avatar
                key={c.id}
                name={c.person}
                photo={(c.personIds ?? []).length === 1 ? getPerson(c.personIds![0])?.photo : undefined}
                size="sm"
              />
            ))}
          </span>
          <span className={styles.person}>{namesOf(answers.map((c) => c.person), 3)}</span>
          {question.unseen && <span className={styles.fresh}>New</span>}
        </div>
        <p className={`serif ${styles.question}`}>
          <Highlight text={question.question} terms={terms} />
        </p>
        <p className={styles.meta}>
          <span className={styles.perspectives}>{perspectivesLine(answers.length)}</span>
          {[question.topic, question.place, relativeDay(latest)].filter(Boolean).map((part) => ` · ${part}`)}
        </p>
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
        <Avatar name={person.name} photo={person.photo} size="md" />
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
  const photo = usePhotoOf(capture);
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
          <Avatar name={person} photo={photo} size="xs" />
          <span className={styles.sourceName}>{sourceLine(person)}</span>
          <span className={styles.sourceQuestion}>
            <Highlight text={capture.question} terms={terms} />
          </span>
        </p>
      </Link>
    </li>
  );
}
