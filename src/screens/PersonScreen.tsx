import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Sheet } from "../components/Sheet";
import { ConversationRow } from "../components/library/Rows";
import rows from "../components/library/Library.module.css";
import { MergeSheet } from "../components/people/MergeSheet";
import { PersonEditSheet } from "../components/people/PersonEditSheet";
import { count } from "../lib/format";
import { findPerson, speakersOf } from "../lib/library";
import { useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
import styles from "./Collection.module.css";

/**
 * Everything one person has taught you, over time. Not a profile: no bio, no
 * followers. Their name, a note only you can see, the questions you asked
 * them and what they said. Each conversation keeps its date: people change.
 */
export function PersonScreen() {
  const { key = "" } = useParams();
  const { captures, people, updatePerson, mergePeople, deletePerson } = useStore();
  const navigate = useNavigate();
  const back = useBack("/library?view=people");
  const id = decodeURIComponent(key);
  const person = useMemo(() => findPerson(captures, id, people), [captures, id, people]);
  const [editing, setEditing] = useState<"all" | "note" | null>(null);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const alone = person.conversations.length - person.together;
  const others = (c: (typeof person.conversations)[number]) =>
    c.person
      .split(" + ")
      .filter((name) => name.trim() && name.trim() !== person.name)
      .join(" + ");

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
        <Button variant="text" size="sm" icon="pencil" onClick={() => setEditing("all")}>
          Edit
        </Button>
      </div>

      <header className={styles.header}>
        <Avatar name={person.name} photo={person.photo} size="xl" />
        <h1 className={`serif ${styles.name}`}>{person.name}</h1>
        {person.note ? (
          <p className={styles.note}>{person.note}</p>
        ) : (
          <button type="button" className={styles.addNote} onClick={() => setEditing("note")}>
            Add a little context
          </button>
        )}
        <p className={`serif ${styles.learned}`}>
          {n > 0
            ? `${n} ${n === 1 ? "thing" : "things"} you’ve learned from ${person.name}`
            : `${count(person.together, "conversation")} with ${person.name} and others`}
        </p>
        {context && <p className={styles.context}>{context}</p>}
      </header>

      <section>
        <h2 className={styles.label}>
          {person.conversations.length === 1 ? "What you asked" : "What you’ve asked, over time"}
        </h2>
        <ul className={rows.list}>
          {person.conversations.map((c) => (
            <ConversationRow
              key={c.id}
              capture={c}
              showPerson={false}
              eyebrow={speakersOf(c).length > 1 ? `${c.topic} · with ${others(c)}` : c.topic}
              showThings
            />
          ))}
        </ul>
        {person.together > 0 && alone > 0 && (
          <p className={styles.aside}>
            Things from a conversation with several people belong to the conversation, so they aren’t counted as{" "}
            {person.name}’s alone.
          </p>
        )}
      </section>

      <footer className={styles.footer}>
        <Button
          variant="quiet"
          size="md"
          icon="mic"
          onClick={() => navigate(`/ask?person=${encodeURIComponent(person.id)}`, { viewTransition: true })}
        >
          Ask {person.name} something
        </Button>
      </footer>

      <PersonEditSheet
        open={editing !== null}
        person={person}
        focusNote={editing === "note"}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          updatePerson(person.id, patch);
          setEditing(null);
        }}
        onMerge={() => {
          setEditing(null);
          setMerging(true);
        }}
        onDelete={() => {
          setEditing(null);
          setDeleting(true);
        }}
      />

      <MergeSheet
        open={merging}
        first={person}
        onClose={() => setMerging(false)}
        onMerge={(fromId, intoId) => {
          setMerging(false);
          mergePeople(fromId, intoId);
          if (intoId !== person.id) navigate(`/library/people/${encodeURIComponent(intoId)}`, { replace: true });
        }}
      />

      <Sheet
        open={deleting}
        title={`Delete ${person.name}?`}
        onClose={() => setDeleting(false)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deletePerson(person.id);
                navigate("/library?view=people", { replace: true, viewTransition: true });
              }}
            >
              Delete {person.name}
            </Button>
            <Button variant="text" size="md" block onClick={() => setDeleting(false)}>
              Cancel
            </Button>
          </>
        }
      >
        This will remove {person.name} and the {count(alone, "conversation")} you had with them from your Library,
        including any recordings.
        {person.together > 0 &&
          ` ${person.together === 1 ? "The conversation" : "Conversations"} you had with ${person.name} and others ${
            person.together === 1 ? "stays" : "stay"
          }, without ${person.name}’s name.`}{" "}
        This can’t be undone.
      </Sheet>
    </main>
  );
}
