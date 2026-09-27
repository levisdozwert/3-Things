import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { IconButton } from "../components/Button";
import { ConversationRow } from "../components/library/Rows";
import rows from "../components/library/Library.module.css";
import { findTopic } from "../lib/library";
import { useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
import styles from "./Collection.module.css";

/**
 * One subject, across everyone who has spoken to it. Each person's view stays
 * separate and in their own words. Nobody is declared right.
 */
export function TopicScreen() {
  const { key = "" } = useParams();
  const { captures } = useStore();
  const back = useBack("/library?view=topics");
  const topic = useMemo(() => findTopic(captures, decodeURIComponent(key)), [captures, key]);

  if (!topic) {
    return (
      <main className={styles.page}>
        <div className={styles.missing}>
          <p className="serif">Nothing is filed under this anymore.</p>
          <Link to="/library?view=topics" viewTransition>
            Back to topics
          </Link>
        </div>
      </main>
    );
  }

  const n = topic.conversations.length;
  const people = topic.people.length;

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
      </div>

      <header className={styles.header}>
        <p className={styles.label}>Topic</p>
        <h1 className={`serif ${styles.name}`}>{topic.name}</h1>
        <p className={`serif ${styles.learned}`}>
          {n} {n === 1 ? "conversation" : "conversations"}
          {people > 0 && ` with ${people} ${people === 1 ? "person" : "people"}`}
        </p>
        {people > 1 && <p className={styles.context}>Different people, different views. Each stays in their own words.</p>}
      </header>

      <ul className={rows.list}>
        {topic.conversations.map((c) => (
          <ConversationRow key={c.id} capture={c} showThings />
        ))}
      </ul>
    </main>
  );
}
