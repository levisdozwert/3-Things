import { IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import flow from "./Flow.module.css";
import styles from "./SendSteps.module.css";

interface HowStepProps {
  question: string;
  onInPerson: () => void;
  onSend: () => void;
  onBack: () => void;
}

/** The question, settled. Then one simple choice: together now, or on their own phone later. */
export function HowStep({ question, onInPerson, onSend, onBack }: HowStepProps) {
  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back to your question" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.label} ${flow.enter}`}>Your question</p>
        <h1 className={`${flow.question} ${flow.questionXL}`}>{question}</h1>

        <section className={`${styles.how} ${flow.enterLate}`} aria-labelledby="how-heading">
          <h2 id="how-heading" className={`serif ${styles.heading}`}>
            How do you want to ask?
          </h2>
          <div className={styles.choices}>
            <button type="button" className={styles.choice} onClick={onInPerson}>
              <span className={styles.choiceIcon} aria-hidden="true">
                <Icon name="mic" size={20} strokeWidth={1.8} />
              </span>
              <span className={styles.choiceText}>
                <span className={styles.choiceTitle}>In person</span>
                <span className={styles.choiceDetail}>Listen together, now.</span>
              </span>
              <Icon name="forward" size={18} className={styles.chevron} />
            </button>
            <button type="button" className={styles.choice} onClick={onSend}>
              <span className={styles.choiceIcon} aria-hidden="true">
                <Icon name="share" size={20} strokeWidth={1.8} />
              </span>
              <span className={styles.choiceText}>
                <span className={styles.choiceTitle}>Send it</span>
                <span className={styles.choiceDetail}>They answer by voice on their own phone, whenever suits them.</span>
              </span>
              <Icon name="forward" size={18} className={styles.chevron} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
