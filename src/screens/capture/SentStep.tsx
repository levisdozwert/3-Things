import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import flow from "./Flow.module.css";
import styles from "./SendSteps.module.css";

interface SentStepProps {
  id: string;
  question: string;
  person: string;
  copied: boolean;
  onAskSomeoneElse: () => void;
  onDone: () => void;
}

/** It's on its way. Nothing to wait on here: their 3 will come back to the Library. */
export function SentStep({ id, question, person, copied, onAskSomeoneElse, onDone }: SentStepProps) {
  const title = copied ? "Link copied" : person ? `Sent to ${person}` : "Question shared";

  return (
    <>
      <div className={flow.topbar} />

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${styles.done} ${flow.enter}`}>
          <span className={styles.check}>
            <Icon name="check" size={16} strokeWidth={2.2} />
          </span>
          {title}
        </p>
        <p className={`${flow.question} ${flow.questionLG} ${styles.quoted}`}>“{question}”</p>

        <div className={`${styles.details} ${flow.enterLate}`}>
          {copied && <p className={styles.line}>Paste it wherever you talk to {person || "people"}.</p>}
          <p className={styles.line}>
            {person
              ? `You’ll see ${person}’s 3 here once they’ve reviewed and sent them. Links don’t expire, so there’s no rush.`
              : "Each answer comes back to you separately, with the name they give. Links don’t expire."}
          </p>
          <div className={styles.links}>
            <Link to={`/a/${encodeURIComponent(id)}?preview=1`} viewTransition className={styles.link}>
              See what {person || "they"} will see
            </Link>
            <button type="button" className={styles.link} onClick={onAskSomeoneElse}>
              Ask someone else too
            </button>
          </div>
        </div>
      </div>

      <div className={flow.footer}>
        <Button block variant="ink" onClick={onDone}>
          Done
        </Button>
      </div>
    </>
  );
}
