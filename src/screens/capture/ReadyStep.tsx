import { Button, IconButton } from "../../components/Button";
import flow from "./Flow.module.css";
import styles from "./ReadyStep.module.css";

interface ReadyStepProps {
  question: string;
  person: string;
  onPersonChange: (name: string) => void;
  consentReminder: boolean;
  starting: boolean;
  onEditQuestion: () => void;
  onStart: () => void;
  onClose: () => void;
}

/** The question, held up for both people to see. Then: listen. */
export function ReadyStep({
  question,
  person,
  onPersonChange,
  consentReminder,
  starting,
  onEditQuestion,
  onStart,
  onClose,
}: ReadyStepProps) {
  const name = person.trim();

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.label} ${flow.enter}`}>Your question</p>
        <h1 className={`${flow.question} ${flow.questionXL}`}>{question}</h1>
        <button type="button" className={`${styles.edit} ${flow.enterLate}`} onClick={onEditQuestion}>
          Change question
        </button>

        <label className={`${styles.who} ${flow.enterLate}`}>
          <span className={flow.label}>Who’s answering?</span>
          <input
            className={styles.whoInput}
            value={person}
            onChange={(e) => onPersonChange(e.target.value)}
            placeholder="Their name (optional)"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div className={`${flow.footer} ${styles.footer}`}>
        <p className={`serif ${styles.ready}`}>{name ? `Ready when ${name} is` : "Ready when they are"}</p>
        {consentReminder && (
          <p className={styles.consent}>Make sure everyone speaking is comfortable being recorded.</p>
        )}
        <Button block icon="mic" onClick={onStart} disabled={starting}>
          Start listening
        </Button>
      </div>
    </>
  );
}
