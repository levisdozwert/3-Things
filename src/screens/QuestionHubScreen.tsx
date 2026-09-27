import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { ThingsEditorial } from "../components/ThingsEditorial";
import { calendarDate, count, relativeDay } from "../lib/format";
import { answeredLine, askedLine, findQuestion, type Asked } from "../lib/questions";
import { useStore } from "../lib/store";
import type { Capture } from "../lib/types";
import { useBack } from "../lib/useBack";
import page from "./Collection.module.css";
import styles from "./Questions.module.css";

const two = (n: number) => String(n).padStart(2, "0");

/** Sent, opened, answered, asked in person: that's all. No times of day, no read receipts. */
function statusOf(a: Asked): string {
  if (a.how === "in person") return `In person · ${relativeDay(a.at)}`;
  if (a.answers[0]) return `Answered · ${relativeDay(a.answers[0].recordedAt)}`;
  return a.state === "opened" ? "Opened" : "Waiting";
}

function linkOf(a: Asked): string {
  if (a.answers[0]) return `/library/${a.answers[0].id}`;
  return `/sent/${encodeURIComponent(a.outgoing?.id ?? a.key)}`;
}

/** One person's answer, their name first. Kept apart from everyone else's. */
function Answer({ capture, fresh }: { capture: Capture; fresh: boolean }) {
  const { getPerson } = useStore();
  const ids = capture.personIds ?? [];
  const photo = ids.length === 1 ? getPerson(ids[0])?.photo : undefined;
  const name = capture.person.trim() || "Someone";
  return (
    <article className={styles.answer} aria-label={`${name}’s answer`}>
      <Link to={`/library/${capture.id}`} viewTransition className={styles.answerHead}>
        <Avatar name={name} photo={photo} size="md" />
        <span className={styles.answerWho}>
          <span className={`serif ${styles.answerName}`}>{name}</span>
          <span className={styles.answerMeta}>
            {calendarDate(capture.recordedAt)} · {capture.remote ? "by link" : "in person"}
            {fresh && <span className={styles.fresh}> · New</span>}
          </span>
        </span>
        <Icon name="forward" size={18} className={styles.chevron} />
      </Link>
      <ol className={styles.answerThings}>
        {capture.things.map((t, i) => (
          <li key={t.id}>
            <span className="serif tabular" aria-hidden="true">
              {two(i + 1)}
            </span>
            <span className="serif">{t.headline}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

/**
 * A question asked of several people: who it went to, how it's going, and
 * each person's answer, in their own words and in the order they arrived.
 * With two or more, their perspectives can be read side by side.
 */
export function QuestionHubScreen() {
  const { group = "" } = useParams();
  const key = decodeURIComponent(group);
  const navigate = useNavigate();
  const back = useBack("/library");
  const { captures, outgoing, people, getPerson, markSeen } = useStore();
  const question = useMemo(() => findQuestion(key, captures, outgoing, people), [key, captures, outgoing, people]);

  // New answers are marked as new this once; having seen them here, they're simply part of the question.
  const [fresh] = useState(() => new Set(question?.answers.filter((c) => c.unseen).map((c) => c.id)));
  useEffect(() => {
    fresh.forEach((id) => markSeen(id));
  }, [fresh, markSeen]);

  if (!question) {
    return (
      <main className={page.page}>
        <div className={page.missing}>
          <p className="serif">This question isn’t here anymore.</p>
          <Link to="/library" viewTransition>
            Back to your 3 Things
          </Link>
        </div>
      </main>
    );
  }

  const { answers, asked } = question;
  const here = `/library/questions/${encodeURIComponent(key)}`;
  const askElse = `/ask?q=${encodeURIComponent(question.question)}&group=${encodeURIComponent(key)}`;

  return (
    <main className={page.page}>
      <div className={page.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
      </div>

      <header className={styles.header}>
        <p className={page.label}>{askedLine(question)}</p>
        <h1 className={`serif ${styles.hero}`}>{question.question}</h1>
        <p className={`serif ${page.learned}`}>{answeredLine(question)}</p>
        {answers.length >= 2 && (
          <Button className={styles.perspectivesButton} onClick={() => navigate(`${here}/perspectives`, { viewTransition: true })}>
            See perspectives
          </Button>
        )}
      </header>

      <section className={styles.block} aria-labelledby="asked-heading">
        <h2 id="asked-heading" className={page.label}>
          People you asked
        </h2>
        <ul className={styles.asked}>
          {asked.map((a) => {
            const photo = a.personIds.length === 1 ? getPerson(a.personIds[0])?.photo : undefined;
            return (
              <li key={a.key}>
                <Link to={linkOf(a)} viewTransition className={styles.askedRow}>
                  <Avatar name={a.name} photo={photo} size="sm" />
                  <span className={styles.askedName}>{a.name || "Anyone with the link"}</span>
                  <span className={`${styles.askedState} ${a.answers.length ? "" : styles.askedWaiting}`}>{statusOf(a)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {answers.length === 0 && (
        <section className={styles.nothingYet}>
          <p className="serif">No answers yet</p>
          <p>Waiting for their 3. Each answer comes back here once that person has reviewed it.</p>
        </section>
      )}

      {answers.length === 1 && (
        <section className={styles.block} aria-labelledby="one-answer">
          <div className={styles.oneHead}>
            <h2 id="one-answer" className={page.label}>
              {answers[0].person.trim() || "Their"}
              {answers[0].person.trim() ? "’s answer" : " answer"}
            </h2>
            <Link to={`/library/${answers[0].id}`} viewTransition className={styles.quietLink}>
              Open
            </Link>
          </div>
          <ThingsEditorial things={answers[0].things} person={answers[0].person} />
          <p className={styles.quiet}>When someone else answers, you’ll be able to read their perspectives side by side.</p>
        </section>
      )}

      {answers.length >= 2 && (
        <section className={styles.block} aria-labelledby="answers-heading">
          <h2 id="answers-heading" className={page.label}>
            Their answers, as they arrived
          </h2>
          {answers.map((c) => (
            <Answer key={c.id} capture={c} fresh={fresh.has(c.id)} />
          ))}
        </section>
      )}

      <section className={styles.growing}>
        <Link to={askElse} viewTransition className={styles.askElse}>
          <span className={styles.askElsePlus} aria-hidden="true">
            <Icon name="plus" size={16} strokeWidth={2} />
          </span>
          Ask someone else
        </Link>
        <p className={page.context}>
          First asked {calendarDate(question.firstAsked)}. {count(question.people, "person", "people")} asked,{" "}
          {count(answers.length, "answer")}, {count(question.things, "thing")} so far.
        </p>
      </section>
    </main>
  );
}
