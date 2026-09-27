import { useEffect, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import { newId, sourceLine } from "../lib/format";
import type { Speaker } from "../lib/people";
import type { Thing } from "../lib/types";
import { Icon } from "./Icon";
import { WhoSheet } from "./people/WhoSheet";
import styles from "./ThingsEditor.module.css";

export interface Draft {
  /** Who answered, as it reads: "Jason", "Jason + Sarah", or empty. */
  person: string;
  /** Who answered, as people: someone in the Library, or a new name. */
  speakers: Speaker[];
  topic: string;
  /** Where it's about, if anywhere. */
  place?: string;
  things: Thing[];
}

/** Suggestions only. Topics emerge from what people ask; any word works. */
export const TOPICS = [
  "Startup",
  "Career",
  "Leadership",
  "Work",
  "Money",
  "Travel",
  "Food",
  "Cooking",
  "Life",
  "Family",
  "Parenting",
  "Relationships",
  "Health",
  "Books",
];

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

interface ThingsEditorProps {
  value: Draft;
  onChange: (draft: Draft) => void;
  /** Bring this thing into view with its headline ready to edit. */
  focusIndex?: number | null;
}

/**
 * Editing is for the person who asked: fix a word, reorder, remove something
 * that wasn't quite theirs. The speaker's original words stay attached.
 */
export function ThingsEditor({ value, onChange, focusIndex = null }: ThingsEditorProps) {
  const { things } = value;
  const listRef = useRef<HTMLOListElement>(null);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    if (focusIndex === null) return;
    const field = listRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea")[focusIndex * 2];
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
    // Only when the editor opens.
  }, []);

  const setThing = (index: number, patch: Partial<Thing>) =>
    onChange({ ...value, things: things.map((t, i) => (i === index ? { ...t, ...patch } : t)) });

  const move = (index: number, delta: -1 | 1) => {
    const next = [...things];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange({ ...value, things: next });
  };

  const remove = (index: number) => onChange({ ...value, things: things.filter((_, i) => i !== index) });

  const add = () => onChange({ ...value, things: [...things, { id: newId(), headline: "", detail: "" }] });

  return (
    <div className={styles.editor}>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>From</span>
          <button type="button" className={styles.metaPerson} onClick={() => setChoosing(true)}>
            <span className={value.person ? undefined : styles.metaEmpty}>
              {value.person || sourceLine("").replace(/^From /, "")}
            </span>
            <span className={styles.metaChange}>{value.person ? "Change" : "Add a name"}</span>
          </button>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel} id="topic-label">
            Topic
          </span>
          <div className={styles.topics} role="radiogroup" aria-labelledby="topic-label">
            {Array.from(new Set([value.topic, ...TOPICS].filter(Boolean))).map((topic) => (
              <button
                key={topic}
                type="button"
                role="radio"
                aria-checked={value.topic === topic}
                className={`${styles.topic} ${value.topic === topic ? styles.topicOn : ""}`}
                onClick={() => onChange({ ...value, topic })}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.metaRow}>
          <span className={styles.metaLabel}>Where</span>
          <input
            className={styles.metaInput}
            value={value.place ?? ""}
            onChange={(e) => onChange({ ...value, place: e.target.value })}
            placeholder="A place, if it’s about one"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
          />
        </label>
      </div>

      <WhoSheet
        open={choosing}
        speakers={value.speakers}
        onClose={() => setChoosing(false)}
        onDone={(speakers, person) => {
          onChange({ ...value, speakers, person });
          setChoosing(false);
        }}
      />

      <ol className={styles.things} ref={listRef}>
        {things.map((thing, i) => (
          <li key={thing.id} className={styles.thing}>
            <span className={`serif tabular ${styles.number}`} aria-hidden="true">
              {i + 1}
            </span>
            <div className={styles.fields}>
              <AutoTextarea
                className={styles.headline}
                value={thing.headline}
                onChange={(e) => setThing(i, { headline: e.target.value.replace(/\n/g, " ") })}
                placeholder="The thing, in a few words"
                aria-label={`Thing ${i + 1}`}
                enterKeyHint="next"
              />
              <AutoTextarea
                className={styles.detail}
                value={thing.detail}
                onChange={(e) => setThing(i, { detail: e.target.value })}
                placeholder="The context they gave (optional)"
                aria-label={`Context for thing ${i + 1}`}
              />
              <div className={styles.controls}>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move thing ${i + 1} up`}>
                  <Icon name="up" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === things.length - 1}
                  aria-label={`Move thing ${i + 1} down`}
                >
                  <Icon name="down" size={18} />
                </button>
                <span className={styles.spacer} />
                {things.length > 1 && (
                  <button type="button" className={styles.remove} onClick={() => remove(i)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {things.length < 3 && (
        <button type="button" className={styles.add} onClick={add}>
          <Icon name="plus" size={18} />
          Add something they said
        </button>
      )}
    </div>
  );
}
