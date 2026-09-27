import { useState } from "react";
import { AudioPlayer } from "../../components/AudioPlayer";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Mark } from "../../components/Mark";
import { ThingList } from "../../components/ThingList";
import type { Draft } from "../../components/ThingsEditor";
import { fromLine } from "../../lib/format";
import type { Recording } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./ReviewStep.module.css";

interface ReviewStepProps {
  question: string;
  draft: Draft;
  onPersonChange: (name: string) => void;
  recording: Recording | null;
  preview: boolean;
  saving: boolean;
  onLooksRight: () => void;
  onEdit: () => void;
  onClose: () => void;
}

/**
 * These words will be attributed to a real person, so the asker gets a light
 * look before saving. One tap is enough when it's right.
 */
export function ReviewStep({
  question,
  draft,
  onPersonChange,
  recording,
  preview,
  saving,
  onLooksRight,
  onEdit,
  onClose,
}: ReviewStepProps) {
  const [naming, setNaming] = useState(!draft.person.trim());
  const count = draft.things.length;
  const prompt = count === 3 ? "Did we get their 3 right?" : `Did we get their ${count === 2 ? "two" : "one"} right?`;

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Leave without saving" onClick={onClose} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <header className={styles.header}>
          <p className={`${flow.prompt} ${flow.enter}`}>{prompt}</p>
          <h1 className={`${flow.question} ${flow.questionLG}`}>{question}</h1>
          <div className={`${styles.from} ${flow.enterLate}`}>
            <Avatar name={draft.person} size="sm" />
            {naming ? (
              <input
                className={styles.nameInput}
                value={draft.person}
                onChange={(e) => onPersonChange(e.target.value)}
                onBlur={() => draft.person.trim() && setNaming(false)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Add their name"
                aria-label="Who shared these?"
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="done"
              />
            ) : (
              <button type="button" className={styles.fromText} onClick={() => setNaming(true)}>
                {fromLine(count, draft.person)}
              </button>
            )}
          </div>
        </header>

        <ThingList things={draft.things} reveal morph showEmptyPositions person={draft.person} />

        <div className={styles.after}>
          {recording?.audio && <AudioPlayer blob={recording.audio} durationSec={recording.durationSec} />}
          {preview && (
            <p className={flow.note}>
              <Mark size="sm" />
              <span>
                <strong>Preview answer.</strong> Transcription isn’t connected in this build, so these come from a
                sample conversation.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className={flow.footer}>
        <div className={flow.footerRow}>
          <Button variant="quiet" size="lg" icon="pencil" onClick={onEdit} className={styles.editButton}>
            Edit
          </Button>
          <Button icon="check" onClick={onLooksRight} disabled={saving}>
            Looks right
          </Button>
        </div>
      </div>
    </>
  );
}
