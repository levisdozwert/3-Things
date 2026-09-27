import { useState } from "react";
import { Button, IconButton } from "../../components/Button";
import flow from "./Flow.module.css";
import styles from "./SendSteps.module.css";

interface ShareStepProps {
  question: string;
  /** Who it's for. Empty: anyone with the link. */
  person: string;
  /** How the question is signed: "Levis asked you for 3". */
  askerName: string;
  onAskerName: (name: string) => void;
  keepsAudio: boolean;
  busy: boolean;
  problem: string | null;
  onShare: () => void;
  onCopy: () => void;
  onBack: () => void;
}

/**
 * The question, ready to travel. It goes through whatever the user already
 * talks with (Messages, WhatsApp, email); 3 Things doesn't become a messenger.
 */
export function ShareStep({
  question,
  person,
  askerName,
  onAskerName,
  keepsAudio,
  busy,
  problem,
  onShare,
  onCopy,
  onBack,
}: ShareStepProps) {
  const [needsName] = useState(!askerName.trim());
  const signed = askerName.trim();
  const them = person || "They";

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <h1 className={`serif ${styles.title} ${flow.enter}`}>{person ? `Send this to ${person}` : "Share this question"}</h1>
        <p className={`${flow.question} ${flow.questionXL} ${styles.quoted}`}>“{question}”</p>

        <div className={`${styles.details} ${flow.enterLate}`}>
          {needsName && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Your name</span>
              <input
                className={styles.input}
                value={askerName}
                onChange={(e) => onAskerName(e.target.value)}
                placeholder="So they know who’s asking"
                autoComplete="given-name"
                autoCapitalize="words"
                maxLength={40}
                enterKeyHint="done"
              />
            </label>
          )}
          <p className={styles.line}>
            {signed ? (
              <>
                {them} will see <strong>“{signed} asked you for 3”</strong>
              </>
            ) : (
              <>{them} will see your name and this question</>
            )}{" "}
            and can answer by voice from the link. No app, no account.
          </p>
          <p className={styles.line}>
            {person
              ? `${person}’s answer comes back only to you, after they’ve reviewed it.`
              : "Anyone with the link can answer. Each answer comes back only to you, separately, after they’ve reviewed it."}
          </p>
          {keepsAudio && (
            <p className={styles.line}>
              You keep original recordings, so {person || "they"} will be asked whether you can keep theirs. It’s off
              unless they allow it.
            </p>
          )}
          {problem && (
            <p className={styles.problem} role="alert">
              {problem}
            </p>
          )}
        </div>
      </div>

      <div className={flow.footer}>
        <Button block icon="share" onClick={onShare} disabled={busy || !signed}>
          Share question
        </Button>
        <Button block variant="text" size="md" onClick={onCopy} disabled={busy || !signed}>
          Copy link
        </Button>
      </div>
    </>
  );
}
