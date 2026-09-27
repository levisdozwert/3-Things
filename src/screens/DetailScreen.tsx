import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Mark } from "../components/Mark";
import { Sheet } from "../components/Sheet";
import { ThingList } from "../components/ThingList";
import { loadRecording } from "../lib/audio/audioStore";
import { calendarDate, duration, fromLine } from "../lib/format";
import { useStore } from "../lib/store";
import { EditStep } from "./capture/EditStep";
import flow from "./capture/Flow.module.css";
import styles from "./DetailScreen.module.css";

export function DetailScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { getCapture, updateCapture, deleteCapture } = useStore();
  const capture = getCapture(id);

  const [editing, setEditing] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasAudio = capture?.hasAudio ?? false;
  useEffect(() => {
    let alive = true;
    if (hasAudio) void loadRecording(id).then((blob) => alive && setAudio(blob));
    return () => {
      alive = false;
    };
  }, [id, hasAudio]);

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

  const hasQuotes = capture.things.some((t) => t.quote);
  const back = () => navigate("/library", { viewTransition: true });

  return (
    <main className={styles.detail}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Your 3 Things" onClick={back} />
        <Button variant="text" size="sm" icon="pencil" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <header className={styles.header}>
        <h1
          className={`serif ${styles.question}`}
          style={{ viewTransitionName: `question-${capture.id}` } as CSSProperties}
        >
          {capture.question}
        </h1>
        <div className={styles.from}>
          <Avatar name={capture.person} size="md" />
          <div>
            <p className={styles.fromLine}>{fromLine(capture.things.length, capture.person)}</p>
            <p className={styles.meta}>
              {capture.topic} · Recorded {calendarDate(capture.recordedAt)}
              {capture.durationSec > 0 && ` · ${duration(capture.durationSec)}`}
            </p>
          </div>
        </div>
      </header>

      <ThingList
        things={capture.things}
        divided
        showQuotes={showQuotes}
        person={capture.person}
        showEmptyPositions
      />

      <div className={styles.after}>
        {hasQuotes && (
          <button type="button" className={styles.quotes} onClick={() => setShowQuotes((v) => !v)} aria-pressed={showQuotes}>
            <span className="serif" aria-hidden="true">
              “
            </span>
            {showQuotes ? "Hide their words" : "In their words"}
          </button>
        )}
        {audio && <AudioPlayer blob={audio} durationSec={capture.durationSec} />}
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
          Remove from your 3 Things
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
        {capture.person ? `What ${capture.person} shared` : "What they shared"} and any recording will be removed from
        this device.
      </Sheet>
    </main>
  );
}
