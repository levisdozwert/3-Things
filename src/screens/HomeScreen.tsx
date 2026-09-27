import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { Wordmark } from "../components/Mark";
import { listPeople } from "../lib/library";
import { answeredLine, groupOf, listQuestions, namesOf, perspectivesLine } from "../lib/questions";
import { isWaiting, sentWhen, stateLabel } from "../lib/remote/describe";
import { starterQuestions } from "../lib/samples";
import { useStore } from "../lib/store";
import styles from "./HomeScreen.module.css";

export function HomeScreen() {
  const navigate = useNavigate();
  const { captures, people, outgoing, getPerson } = useStore();
  // Answers that came back and haven't been opened. Personal, not a feed.
  const arrived = captures.filter((c) => c.unseen);
  // Waiting, by question: the same question sent to four people is one row, not four.
  const questions = useMemo(() => listQuestions(captures, outgoing, people), [captures, outgoing, people]);
  const answersTo = (group: string) => questions.find((q) => q.key === group)?.answers.length ?? 0;
  const waiting = questions
    .map((q) => ({ q, out: q.asked.filter((a) => a.outgoing && isWaiting(a.outgoing) && a.answers.length === 0) }))
    .filter((w) => w.out.length > 0)
    .sort((a, b) => b.out[b.out.length - 1].at.localeCompare(a.out[a.out.length - 1].at));

  // Once asking people things is a habit (not on a first visit), the people
  // you learn from most recently are one tap from asking again.
  const recent = useMemo(() => {
    const everyone = listPeople(captures, people);
    const named = captures.filter((c) => c.person.trim()).length;
    return named >= 5 && everyone.length >= 3 ? everyone.slice(0, 3) : [];
  }, [captures, people]);

  return (
    <main className={styles.home}>
      <h1 className="visually-hidden">3 Things</h1>
      <header className={styles.header}>
        <Wordmark />
      </header>

      <section className={styles.hero}>
        <button
          type="button"
          className={styles.ask}
          onClick={() => navigate("/ask", { viewTransition: true })}
        >
          <span className={styles.presence} aria-hidden="true">
            <span className={styles.halo} />
            <span className={styles.halo} />
            <span className={styles.halo} />
            <span className={styles.orb}>
              <Icon name="mic" size={38} strokeWidth={1.6} />
            </span>
          </span>
          <span className={`serif ${styles.title}`}>Ask for 3</span>
        </button>

        <p className={styles.lede}>
          <span>Ask someone anything.</span> <span>Keep the three things that matter.</span>
        </p>

        <Link to="/ask?type=1" viewTransition className={styles.type}>
          <Icon name="keyboard" size={18} strokeWidth={1.6} />
          Type a question
        </Link>
      </section>

      {arrived.length > 0 && (
        <section className={styles.again} aria-labelledby="new-from-people">
          <h2 id="new-from-people" className={styles.examplesTitle}>
            New from your people
          </h2>
          <ul className={styles.rows}>
            {arrived.map((c) => {
              const ids = c.personIds ?? [];
              const photo = ids.length === 1 ? getPerson(ids[0])?.photo : undefined;
              return (
                <li key={c.id}>
                  <Link to={`/library/${c.id}`} viewTransition className={styles.row}>
                    <Avatar name={c.person} photo={photo} size="sm" />
                    <span className={styles.rowText}>
                      <span className={styles.rowWho}>{c.person || "Someone"} answered your question</span>
                      <span className={`serif ${styles.rowQuestion}`}>{c.question}</span>
                      <span className={styles.rowAction}>
                        See {c.person ? `${c.person}’s` : "their"} 3
                        {answersTo(groupOf(c)) >= 2 && (
                          <span className={styles.rowMeta}> · {perspectivesLine(answersTo(groupOf(c))).toLowerCase()} so far</span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className={styles.again} aria-labelledby="ask-again">
          <h2 id="ask-again" className={styles.examplesTitle}>
            Ask again
          </h2>
          <ul className={styles.againList}>
            {recent.map((p) => (
              <li key={p.id}>
                <Link to={`/ask?person=${encodeURIComponent(p.id)}`} viewTransition className={styles.againPerson}>
                  <Avatar name={p.name} photo={p.photo} size="sm" />
                  <span>{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {waiting.length > 0 && (
        <section className={styles.again} aria-labelledby="waiting">
          <h2 id="waiting" className={styles.examplesTitle}>
            Waiting for answers
          </h2>
          <ul className={styles.rows}>
            {waiting.slice(0, 3).map(({ q, out }) => {
              const several = q.people > 1;
              const one = out[0].outgoing!;
              const names = namesOf(out.map((a) => a.name || "Anyone with the link"));
              return (
                <li key={q.key}>
                  <Link
                    to={several ? `/library/questions/${encodeURIComponent(q.key)}` : `/sent/${encodeURIComponent(one.id)}`}
                    viewTransition
                    className={styles.row}
                  >
                    {/* Two of the people still to answer, drawn the way a pair always is. */}
                    <Avatar name={out.slice(0, 2).map((a) => a.name).join(" + ")} size="sm" />
                    <span className={styles.rowText}>
                      <span className={styles.rowWho}>{names}</span>
                      <span className={`serif ${styles.rowQuestion}`}>{q.question}</span>
                      <span className={styles.rowMeta}>
                        {several
                          ? `${answeredLine(q)} · ${sentWhen(out[0].at)}`
                          : `${sentWhen(one.sentAt)}${one.state === "opened" ? ` · ${stateLabel(one)}` : ""}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {outgoing.length > 3 && (
            <Link to="/sent" viewTransition className={styles.allSent}>
              Everything you’ve sent
            </Link>
          )}
        </section>
      )}

      <section className={styles.examples} aria-labelledby="try-asking">
        <h2 id="try-asking" className={styles.examplesTitle}>
          Try asking someone
        </h2>
        <ul className={styles.exampleList}>
          {starterQuestions.map((q) => (
            <li key={q}>
              <Link to={`/ask?q=${encodeURIComponent(q)}`} viewTransition className={`serif ${styles.example}`}>
                <span>“{q}”</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
