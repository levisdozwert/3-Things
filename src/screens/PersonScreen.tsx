import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { ConversationRow } from "../components/library/Rows";
import rows from "../components/library/Library.module.css";
import { findPerson } from "../lib/library";
import { useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
import styles from "./Collection.module.css";

/**
 * Everything one person has taught you, over time. Not a profile: no bio, no
 * counts of followers. Just the questions you asked them and what they said.
 */
export function PersonScreen() {
  const { key = "" } = useParams();
  const { captures } = useStore();
  const navigate = useNavigate();
  const back = useBack("/library?view=people");
  const person = useMemo(() => findPerson(captures, decodeURIComponent(key)), [captures, key]);

  if (!person) {
    return (
      <main className={styles.page}>
        <div className={styles.missing}>
          <p className="serif">There’s nothing from them here anymore.</p>
          <Link to="/library?view=people" viewTransition>
            Back to people
          </Link>
        </div>
      </main>
    );
  }

  const n = person.things;
  const context = [...person.topics, ...person.places].slice(0, 5).join(" · ");

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
      </div>

      <header className={styles.header}>
        <Avatar name={person.name} size="xl" />
        <h1 className={`serif ${styles.name}`}>{person.name}</h1>
        <p className={`serif ${styles.learned}`}>
          {n} {n === 1 ? "thing" : "things"} you’ve learned from {person.name}
        </p>
        {context && <p className={styles.context}>{context}</p>}
      </header>

      <section>
        <h2 className={styles.label}>
          {person.conversations.length === 1 ? "What you asked" : "What you’ve asked, over time"}
        </h2>
        <ul className={rows.list}>
          {person.conversations.map((c) => (
            <ConversationRow key={c.id} capture={c} showPerson={false} eyebrow={c.topic} showThings />
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <Button
          variant="quiet"
          size="md"
          icon="mic"
          onClick={() => navigate(`/ask?person=${encodeURIComponent(person.name)}`, { viewTransition: true })}
        >
          Ask {person.name} something
        </Button>
      </footer>
    </main>
  );
}
