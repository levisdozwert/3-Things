import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SavedCard } from "../../components/SavedCard";
import { Sheet } from "../../components/Sheet";
import { TOPICS } from "../../components/ThingsEditor";
import { WhoSheet } from "../../components/people/WhoSheet";
import { shareCapture, type ShareResult } from "../../lib/share";
import { useStore } from "../../lib/store";
import type { Capture } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./SavedStep.module.css";

interface SavedStepProps {
  capture: Capture;
  /** They were new to the Library just now: offer, never require, a little context. */
  introduced?: boolean;
  onDone: () => void;
}

const SHARE_LABEL: Partial<Record<ShareResult, string>> = {
  copied: "Copied",
  failed: "Couldn’t share",
};

export function SavedStep({ capture: saved, introduced = false, onDone }: SavedStepProps) {
  const { getCapture, updateCapture, getPerson, updatePerson, setSpeakers } = useStore();
  const capture = getCapture(saved.id) ?? saved;
  const ids = capture.personIds ?? [];
  const person = ids.length === 1 ? getPerson(ids[0]) : undefined;
  const [naming, setNaming] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState<ShareResult | null>(null);
  const [filing, setFiling] = useState(false);
  const [topic, setTopic] = useState(capture.topic);
  const [place, setPlace] = useState(capture.place ?? "");

  useEffect(() => {
    if (!shared) return;
    const timeout = window.setTimeout(() => setShared(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [shared]);

  const openFiling = () => {
    setTopic(capture.topic);
    setPlace(capture.place ?? "");
    setFiling(true);
  };

  const topics = Array.from(new Set([capture.topic, ...TOPICS].filter(Boolean)));

  return (
    <>
      <div className={flow.topbar} />

      <div className={`${flow.content} ${styles.content}`}>
        <p className={styles.saved}>
          <span className={styles.check}>
            <Icon name="check" size={16} strokeWidth={2.2} />
          </span>
          Saved to your 3&nbsp;Things
          <Link to={`/library/${capture.id}`} viewTransition className={styles.view}>
            View
          </Link>
        </p>
        <div className={styles.card}>
          <SavedCard capture={capture} />
        </div>
        <p className={styles.filed}>
          <span>
            Filed under <strong>{[capture.topic, capture.place].filter(Boolean).join(" · ")}</strong>
          </span>
          <button type="button" onClick={openFiling}>
            Change
          </button>
        </p>
        {ids.length === 0 && (
          <p className={styles.filed}>
            <span>From this conversation</span>
            <button type="button" onClick={() => setNaming(true)}>
              Add a name
            </button>
          </p>
        )}
        {person && introduced && (
          <p className={styles.filed}>
            {person.note ? (
              <span>
                {person.name}: <strong>{person.note}</strong>
              </span>
            ) : (
              <span>{person.name} is new to your Library.</span>
            )}
            <button
              type="button"
              onClick={() => {
                setNote(person.note ?? "");
                setNoting(true);
              }}
            >
              {person.note ? "Edit" : "Add a little context"}
            </button>
          </p>
        )}
      </div>

      <div className={flow.footer}>
        <div className={flow.footerRow}>
          <Button
            variant="quiet"
            icon={shared === "copied" ? "check" : "share"}
            className={styles.share}
            onClick={async () => setShared(await shareCapture(capture))}
          >
            {(shared && SHARE_LABEL[shared]) || "Share"}
          </Button>
          <Button variant="ink" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>

      <WhoSheet
        open={naming}
        speakers={[]}
        onClose={() => setNaming(false)}
        onDone={(speakers) => {
          setSpeakers(capture.id, speakers);
          setNaming(false);
        }}
      />

      {person && (
        <Sheet
          open={noting}
          title={`A little context about ${person.name}`}
          onClose={() => setNoting(false)}
          actions={
            <>
              <Button
                variant="ink"
                block
                onClick={() => {
                  updatePerson(person.id, { note: note.trim() });
                  setNoting(false);
                }}
              >
                Save
              </Button>
              <Button variant="text" size="md" block onClick={() => setNoting(false)}>
                Not now
              </Button>
            </>
          }
        >
          <input
            className={styles.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Friend, former manager, met at a conference…"
            aria-label={`A little context about ${person.name}`}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
            data-autofocus
          />
          <p className={styles.noteHint}>Just for you, to remember who they are. Nobody else can see it.</p>
        </Sheet>
      )}

      <Sheet
        open={filing}
        title="What’s this about?"
        onClose={() => setFiling(false)}
        actions={
          <Button
            variant="ink"
            block
            onClick={() => {
              updateCapture(capture.id, { topic: topic.trim() || capture.topic, place: place.trim() || undefined });
              setFiling(false);
            }}
          >
            Done
          </Button>
        }
      >
        <div className={styles.filing}>
          <div className={styles.topics} role="radiogroup" aria-label="Topic">
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={topic === t}
                className={`${styles.topic} ${topic === t ? styles.topicOn : ""}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className={styles.placeField}>
            <span>Where</span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="A place, if it’s about one"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
            />
          </label>
        </div>
      </Sheet>
    </>
  );
}
