import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { Wordmark } from "../components/Mark";
import { listPeople } from "../lib/library";
import { starterQuestions } from "../lib/samples";
import { useStore } from "../lib/store";
import styles from "./HomeScreen.module.css";

export function HomeScreen() {
  const navigate = useNavigate();
  const { captures, people } = useStore();

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
