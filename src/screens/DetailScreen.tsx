import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Mark } from "../components/Mark";
import { Sheet } from "../components/Sheet";
import { ThingsEditorial } from "../components/ThingsEditorial";
import { loadRecording } from "../lib/audio/audioStore";
import { calendarDate, duration, sourceLine } from "../lib/format";
import { shareCapture, type ShareResult } from "../lib/share";
import { useStore } from "../lib/store";
import { EditStep } from "./capture/EditStep";
import flow from "./capture/Flow.module.css";
import styles from "./DetailScreen.module.css";

/**
 * A saved 3 Things: the person, the question, and what they said.
 * Metadata stays quiet; the knowledge dominates. The recording is secondary.
 */
export function DetailScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { getCapture, updateCapture, deleteCapture } = useStore();
  const capture = getCapture(id);

  const [editing, setEditing] = useState(false);
  const [clips, setClips] = useState<Blob[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shared, setShared] = useState<ShareResult | null>(null);

  const hasAudio = capture?.hasAudio ?? false;
  useEffect(() => {
    let alive = true;
    if (hasAudio) void loadRecording(id).then((blobs) => alive && setClips(blobs));
    return () => {
      alive = false;
    };
  }, [id, hasAudio]);

  useEffect(() => {
    if (!shared) return;
    const timeout = window.setTimeout(() => setShared(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [shared]);

  if (!capture) {
    return (
      <main className={styles.detail}>
        <div className={styles.missing}>
          <p className="serif">This conversation isn’t here anymore.</p>
          <Link to="/library" viewTransition>
            Back to your 3 Things
          </Link>
        </div>
      </main>
    );
  }

  const back = () => navigate("/library", { viewTransition: true });
  const person = capture.person.trim();
  const meta = [calendarDate(capture.recordedAt), capture.topic, capture.durationSec > 0 ? duration(capture.durationSec) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className={styles.detail}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Your 3 Things" onClick={back} />
        <div className={styles.actions}>
          {shared === "copied" && <span className={styles.copied}>Copied</span>}
          <IconButton icon="share" label="Share" onClick={async () => setShared(await shareCapture(capture))} />
          <Button variant="text" size="sm" icon="pencil" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.person}>
          <Avatar name={person} size="lg" />
          <div>
            <p className={`serif ${styles.name} ${person ? "" : styles.unnamed}`}>{person || sourceLine("")}</p>
            <p className={styles.meta}>{meta}</p>
          </div>
        </div>

        <p className={styles.label}>Question</p>
        <h1
          className={`serif ${styles.question}`}
          style={{ viewTransitionName: `question-${capture.id}` } as CSSProperties}
        >
          {capture.question}
        </h1>
      </header>

      <ThingsEditorial things={capture.things} person={person} />

      <div className={styles.after}>
        {clips.map((clip, i) => (
          <AudioPlayer
            key={i}
            blob={clip}
            durationSec={i === 0 ? capture.durationSec : 0}
            label={i === 0 ? "Listen back" : "Listen to the follow-up"}
          />
        ))}
        {capture.preview && (
          <p className={flow.note}>
            <Mark size="sm" />
            <span>
              <strong>Preview answer.</strong> Saved while transcription wasn’t connected, so these come from a sample
              conversation.
            </span>
          </p>
        )}
        {(capture.edited || capture.origin === "manual") && (
          <p className={styles.provenance}>
            {capture.origin === "manual" ? "Written down by you." : "Edited by you after the conversation."}
          </p>
        )}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.remove} onClick={() => setConfirmDelete(true)}>
          Remove from your 3&nbsp;Things
        </button>
      </footer>

      {editing && (
        <div className={styles.editLayer}>
          <div className={flow.flow}>
            <EditStep
              question={capture.question}
              draft={{ person: capture.person, topic: capture.topic, things: capture.things }}
              saveLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSave={(draft) => {
                updateCapture(capture.id, {
                  person: draft.person.trim(),
                  topic: draft.topic,
                  things: draft.things.map((t) => ({ ...t, headline: t.headline.trim(), detail: t.detail.trim() })),
                  edited: capture.origin !== "manual" ? true : undefined,
                });
                setEditing(false);
              }}
            />
          </div>
        </div>
      )}

      <Sheet
        open={confirmDelete}
        title="Remove these 3 Things?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deleteCapture(capture.id);
                back();
              }}
            >
              Remove
            </Button>
            <Button variant="text" size="md" block onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </>
        }
      >
        {person ? `What ${person} shared` : "What they shared"} and any recording will be removed from this device.
      </Sheet>
    </main>
  );
}
