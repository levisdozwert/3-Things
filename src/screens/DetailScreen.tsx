import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Mark } from "../components/Mark";
import { Sheet } from "../components/Sheet";
import { ThingsEditorial } from "../components/ThingsEditorial";
import { WhoSheet } from "../components/people/WhoSheet";
import { loadRecording } from "../lib/audio/audioStore";
import { calendarDate, duration, sourceLine } from "../lib/format";
import { topicKey } from "../lib/library";
import { shareCapture, type ShareResult } from "../lib/share";
import { useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
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
  const location = useLocation();
  const back = useBack("/library");
  const { getCapture, getPerson, updateCapture, setSpeakers, deleteCapture, deleteAudio, toggleKeepClose } = useStore();
  const capture = getCapture(id);
  // Arriving from a search result: bring that one thing forward.
  const focus = (location.state as { focus?: string } | null)?.focus;

  const [editing, setEditing] = useState(false);
  const [clips, setClips] = useState<Blob[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAudio, setConfirmAudio] = useState(false);
  const [naming, setNaming] = useState(false);
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
    if (!focus) return;
    const timeout = window.setTimeout(() => {
      document.getElementById(`thing-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [focus]);

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

  const person = capture.person.trim();
  const kept = Boolean(capture.keptClose);
  const ids = capture.personIds ?? [];
  const members = ids.flatMap((pid) => getPerson(pid) ?? []);
  const speakers = ids.map((pid) => ({ id: pid }));

  return (
    <main className={styles.detail}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
        <div className={styles.actions}>
          {shared === "copied" && <span className={styles.copied}>Copied</span>}
          <IconButton
            icon={kept ? "bookmarked" : "bookmark"}
            label={kept ? "Kept close" : "Keep close"}
            aria-pressed={kept}
            className={kept ? styles.keptOn : undefined}
            onClick={() => toggleKeepClose(capture.id)}
          />
          <IconButton icon="share" label="Share" onClick={async () => setShared(await shareCapture(capture))} />
          <Button variant="text" size="sm" icon="pencil" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.person}>
          <Avatar name={person} photo={members.length === 1 ? members[0].photo : undefined} size="lg" />
          <div>
            {members.length > 0 ? (
              <p className={`serif ${styles.name}`}>
                {members.map((m, i) => (
                  <Fragment key={m.id}>
                    {i > 0 && " + "}
                    <Link to={`/library/people/${encodeURIComponent(m.id)}`} viewTransition className={styles.nameLink}>
                      {m.name}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ) : (
              <p className={`serif ${styles.name} ${styles.unnamed}`}>
                {sourceLine("")}{" "}
                <button type="button" className={styles.addName} onClick={() => setNaming(true)}>
                  Add a name
                </button>
              </p>
            )}
            <p className={styles.meta}>
              {calendarDate(capture.recordedAt)}
              {capture.topic && (
                <>
                  {" · "}
                  <Link to={`/library/topics/${encodeURIComponent(topicKey(capture.topic))}`} viewTransition>
                    {capture.topic}
                  </Link>
                </>
              )}
              {capture.place && ` · ${capture.place}`}
              {capture.durationSec > 0 && ` · ${duration(capture.durationSec)}`}
            </p>
            {kept && <p className={styles.keptNote}>Kept close</p>}
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

      <ThingsEditorial things={capture.things} person={person} fresh={focus ? [focus] : []} />

      <div className={styles.after}>
        {clips.map((clip, i) => (
          <AudioPlayer
            key={i}
            blob={clip}
            durationSec={i === 0 ? capture.durationSec : 0}
            label={i === 0 ? "Listen back" : "Listen to the follow-up"}
          />
        ))}
        {clips.length > 0 && (
          <button type="button" className={styles.deleteAudio} onClick={() => setConfirmAudio(true)}>
            Delete the recording
          </button>
        )}
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
              draft={{ person: capture.person, speakers, topic: capture.topic, place: capture.place, things: capture.things }}
              saveLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSave={(draft) => {
                if (JSON.stringify(draft.speakers) !== JSON.stringify(speakers)) setSpeakers(capture.id, draft.speakers);
                updateCapture(capture.id, {
                  topic: draft.topic,
                  place: draft.place?.trim() || undefined,
                  things: draft.things.map((t) => ({ ...t, headline: t.headline.trim(), detail: t.detail.trim() })),
                  edited: capture.origin !== "manual" ? true : undefined,
                });
                setEditing(false);
              }}
            />
          </div>
        </div>
      )}

      <WhoSheet
        open={naming}
        speakers={speakers}
        onClose={() => setNaming(false)}
        onDone={(next) => {
          setSpeakers(capture.id, next);
          setNaming(false);
        }}
      />

      <Sheet
        open={confirmAudio}
        title="Delete the recording?"
        onClose={() => setConfirmAudio(false)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deleteAudio(capture.id);
                setClips([]);
                setConfirmAudio(false);
              }}
            >
              Delete recording
            </Button>
            <Button variant="text" size="md" block onClick={() => setConfirmAudio(false)}>
              Cancel
            </Button>
          </>
        }
      >
        The three things stay. Only the audio is removed from this device, and you won’t be able to listen back.
      </Sheet>

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
                navigate("/library", { replace: true, viewTransition: true });
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
