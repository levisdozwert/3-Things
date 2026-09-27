import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../../components/Button";
import flow from "./Flow.module.css";
import styles from "./WhoStep.module.css";

interface WhoStepProps {
  question: string;
  person: string;
  onPersonChange: (name: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}

/**
 * The question, settled. Then, optionally, who it's for. A first name is
 * enough; it's what lets the result say "3 Things from Jason".
 */
export function WhoStep({ question, person, onPersonChange, onContinue, onSkip, onBack }: WhoStepProps) {
  const [adding, setAdding] = useState(Boolean(person.trim()));
  const inputRef = useRef<HTMLInputElement>(null);
  const name = person.trim();

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back to your question" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.label} ${flow.enter}`}>Your question</p>
        <h1 className={`${flow.question} ${flow.questionXL}`}>{question}</h1>

        <section className={`${styles.who} ${flow.enterLate}`} aria-labelledby="who-heading">
          <h2 id="who-heading" className={`serif ${styles.whoHeading}`}>
            Who are you asking?
          </h2>
          {adding ? (
            <>
              <input
                ref={inputRef}
                className={styles.name}
                value={person}
                onChange={(e) => onPersonChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name) onContinue();
                }}
                placeholder="Their first name"
                aria-label="Their first name"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={40}
              />
              <p className={styles.hint} aria-live="polite">
                {name ? (
                  <>
                    You’ll keep this as <strong>3&nbsp;Things from {name}</strong>.
                  </>
                ) : (
                  "A first name is enough."
                )}
              </p>
            </>
          ) : (
            <p className={styles.hint}>Optional. It’s how you’ll remember whose answer this is.</p>
          )}
        </section>
      </div>

      <div className={flow.footer}>
        {adding ? (
          <Button block onClick={onContinue} disabled={!name}>
            Continue
          </Button>
        ) : (
          <Button block icon="plus" onClick={() => setAdding(true)}>
            Add their name
          </Button>
        )}
        <Button block variant="text" size="md" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </>
  );
}
