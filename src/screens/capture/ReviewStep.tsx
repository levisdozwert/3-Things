import { useState } from "react";
import { AudioPlayer } from "../../components/AudioPlayer";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Mark } from "../../components/Mark";
import { Sheet } from "../../components/Sheet";
import { ThingsEditorial } from "../../components/ThingsEditorial";
import { WhoSheet } from "../../components/people/WhoSheet";
import type { Draft } from "../../components/ThingsEditor";
import { sourceLine } from "../../lib/format";
import type { Speaker } from "../../lib/people";
import type { Recording, Thing } from "../../lib/types";
import flow from "./Flow.module.css";
import styles from "./ReviewStep.module.css";

interface ReviewStepProps {
  question: string;
  draft: Draft;
  /** A fourth idea the speaker also cared about. Offered, never shown as a fourth thing. */
  extra: Thing | null;
  onPersonChange: (speakers: Speaker[], label: string) => void;
  /** The conversation, then any follow-ups. */
  recordings: Recording[];
  preview: boolean;
  saving: boolean;
  /** A quiet word after a follow-up, e.g. when nothing new came up. */
  note: string | null;
  /** Things just added or clarified. */
  fresh: string[];
  onLooksRight: () => void;
  onEdit: (index?: number) => void;
  onClarify: (index: number) => void;
  onKeepAsIs: (index: number) => void;
  onAskMore: () => void;
  onSwapExtra: (index: number) => void;
  onClose: () => void;
  /**
   * The person who spoke is the one reviewing, on their own phone, before
   * anything is sent in their name.
   */
  answering?: { askerName: string };
}

const COUNT_WORDS = ["no", "one", "two", "three"];

/**
 * The three things, as the speaker meant them, just clearer. The source is
 * always visible, gaps stay gaps, and one tap saves when it's right.
 */
export function ReviewStep({
  question,
  draft,
  extra,
  onPersonChange,
  recordings,
  preview,
  saving,
  note,
  fresh,
  onLooksRight,
  onEdit,
  onClarify,
  onKeepAsIs,
  onAskMore,
  onSwapExtra,
  onClose,
  answering,
}: ReviewStepProps) {
  const [naming, setNaming] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const count = draft.things.length;
  const person = draft.person.trim();
  const unclear = draft.things.filter((t) => t.unclear).length;

  const summary = [
    count < 3 ? `We found ${count} clear ${count === 1 ? "thing" : "things"}` : null,
    unclear === 1 ? "One thing needs clarification" : unclear > 1 ? `${COUNT_WORDS[unclear]} things need clarification` : null,
  ].filter(Boolean);

  const source = answering
    ? count === 3
      ? "Your 3 Things"
      : `Your ${COUNT_WORDS[count]} ${count === 1 ? "thing" : "things"}`
    : count === 3 && person
      ? `3 Things from ${person}`
      : sourceLine(person);
  const askMoreLabel = answering ? "Add one more" : count === 2 ? "Ask for one more" : "Ask for two more";

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label={answering ? "Stop without sending" : "Leave without saving"} onClick={onClose} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <header className={styles.header}>
          <h1 className={`${flow.question} ${styles.question}`}>{question}</h1>
          <div className={`${styles.from} ${flow.enterLate}`}>
            {!answering && <Avatar name={person} size="sm" />}
            <span className={styles.source}>{source}</span>
            {!person && !answering && (
              <button type="button" className={styles.addName} onClick={() => setNaming(true)}>
                Add their name
              </button>
            )}
          </div>
          <WhoSheet
            open={naming}
            speakers={draft.speakers}
            onClose={() => setNaming(false)}
            onDone={(speakers, label) => {
              onPersonChange(speakers, label);
              setNaming(false);
            }}
          />
          {(summary.length > 0 || note) && (
            <p className={`${styles.summary} ${flow.enterLate}`} aria-live="polite">
              {summary.length > 0 && <span className={styles.summaryDot} aria-hidden="true" />}
              {[...summary, note].filter(Boolean).join(". ")}
              {(summary.length > 0 || note) && "."}
            </p>
          )}
        </header>

        <ThingsEditorial
          things={draft.things}
          person={person}
          reveal
          morph
          fresh={fresh}
          onClarify={onClarify}
          onEdit={onEdit}
          onKeep={onKeepAsIs}
          missing={
            <div className={styles.missing}>
              <p className={`serif ${styles.missingNote}`}>
                {answering
                  ? `${count === 1 ? "One clear thing" : "Two clear things"}. That’s fine to send as it is.`
                  : `Only ${COUNT_WORDS[count]} clear ${count === 1 ? "thing" : "things"} came up. We didn’t fill the ${
                      count === 2 ? "third" : "rest"
                    }.`}
              </p>
              <Button variant="quiet" size="md" icon="mic" onClick={onAskMore} className={styles.askMore}>
                {askMoreLabel}
              </Button>
            </div>
          }
        />

        <div className={styles.after}>
          {extra && (
            <p className={styles.extra}>
              There was one more idea worth keeping.
              <button type="button" onClick={() => setShowExtra(true)}>
                See it
              </button>
            </p>
          )}
          {recordings.map(
            (rec, i) =>
              rec.audio && (
                <AudioPlayer
                  key={i}
                  blob={rec.audio}
                  durationSec={rec.durationSec}
                  label={i === 0 ? "Listen back" : "Listen to the follow-up"}
                />
              ),
          )}
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

      <div className={`${flow.footer} ${styles.footer}`}>
        <p className={styles.prompt}>
          {answering ? "Does this sound like you?" : `Did we get their ${count === 3 ? "3" : count} right?`}
        </p>
        <div className={flow.footerRow}>
          <Button variant="quiet" icon="pencil" onClick={() => onEdit()} className={styles.editButton}>
            Edit
          </Button>
          <Button icon="check" onClick={onLooksRight} disabled={saving || count === 0}>
            {answering ? `Send my ${count}` : "Looks right"}
          </Button>
        </div>
        {answering && (
          <p className={styles.sendNote}>Nothing is shared with {answering.askerName} until you send it.</p>
        )}
      </div>

      {extra && (
        <Sheet
          open={showExtra}
          title="One more idea worth keeping"
          onClose={() => setShowExtra(false)}
          actions={
            <Button variant="text" size="md" block onClick={() => setShowExtra(false)}>
              Keep these three
            </Button>
          }
        >
          <div className={styles.extraSheet}>
            <p className={`serif ${styles.extraHeadline}`}>{extra.headline}</p>
            {extra.detail && <p className={styles.extraContext}>{extra.detail}</p>}
            <p className={styles.swapLabel}>Swap it in for</p>
            <ul className={styles.swapList}>
              {draft.things.map((thing, i) => (
                <li key={thing.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSwapExtra(i);
                      setShowExtra(false);
                    }}
                  >
                    <span className={`serif ${styles.swapNumber}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{thing.headline}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Sheet>
      )}
    </>
  );
}
