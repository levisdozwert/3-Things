import { IconButton } from "../../components/Button";
import { Orb } from "../../components/Orb";
import flow from "./Flow.module.css";
import styles from "./ReadyStep.module.css";

interface ReadyStepProps {
  question: string;
  person: string;
  consentReminder: boolean;
  starting: boolean;
  onStart: () => void;
  onBack: () => void;
}

/** The pause before a good answer. One thing to do: start listening. */
export function ReadyStep({ question, person, consentReminder, starting, onStart, onBack }: ReadyStepProps) {
  const name = person.trim();

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.question} ${styles.question}`}>“{question}”</p>

        <div className={styles.center}>
          <h1 className={`serif ${styles.ready} ${flow.enter}`}>
            {name ? (
              <>
                Ready when <span className={styles.name}>{name}</span> is
              </>
            ) : (
              "Ready when they are"
            )}
          </h1>
          <p className={`${styles.helper} ${flow.enterLate}`}>
            Let them answer naturally. They don’t need to organize their thoughts into exactly three points.
          </p>
        </div>
      </div>

      <div className={`${flow.footer} ${styles.footer}`}>
        {consentReminder && (
          <p className={styles.consent}>
            <span className={styles.consentDot} aria-hidden="true" />
            Make sure everyone speaking is comfortable being recorded.
          </p>
        )}
        <Orb label="Start listening" onClick={onStart} disabled={starting} transitionName="voice-forms">
          <span className={styles.marks} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </Orb>
      </div>
    </>
  );
}
