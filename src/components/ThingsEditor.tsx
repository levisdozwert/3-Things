import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { newId } from "../lib/format";
import type { Thing } from "../lib/types";
import { Icon } from "./Icon";
import styles from "./ThingsEditor.module.css";

export interface Draft {
  person: string;
  topic: string;
  things: Thing[];
}

const TOPICS = ["Travel", "Food", "Work", "Career", "Startup", "Life", "Family", "Books"];

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
        <label className={styles.metaRow}>
          <span className={styles.metaLabel}>From</span>
          <input
            className={styles.metaInput}
            value={value.person}
            onChange={(e) => onChange({ ...value, person: e.target.value })}
            placeholder="Their name"
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
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
      </div>

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
