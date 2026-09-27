import { useMemo, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { PersonPicker } from "../../components/people/PersonPicker";
import { countWords, listOf, onDay } from "../../lib/format";
import { listPeople } from "../../lib/library";
import { askedBefore, isNew, nameKey, type Speaker } from "../../lib/people";
import { useStore } from "../../lib/store";
import { HowMany } from "./FewPeopleStep";
import flow from "./Flow.module.css";
import styles from "./WhoStep.module.css";

interface WhoStepProps {
  question: string;
  speakers: Speaker[];
  onChange: (speakers: Speaker[]) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  /** Sending the question: skipping makes a link anyone can answer. */
  sending?: boolean;
  /** Offered when sending: ask a few people instead of one. */
  onFew?: () => void;
}

type Mode = "find" | "name" | "chosen";


/**
 * Who are you asking? Find someone you've asked before as you type, or name
 * someone new. Choosing someone you know brings back, quietly, what you've
 * asked them before. Never a profile, never a form.
 */
export function WhoStep({ question, speakers, onChange, onContinue, onSkip, onBack, sending = false, onFew }: WhoStepProps) {
  const { captures, people } = useStore();
  const everyone = useMemo(() => listPeople(captures, people), [captures, people]);
  const current = speakers[0];
  const [mode, setMode] = useState<Mode>(!current ? "find" : isNew(current) ? "name" : "chosen");
  const [newName, setNewName] = useState(current && isNew(current) ? current.name : "");
  const [showPrevious, setShowPrevious] = useState(false);

  const chosen = current && !isNew(current) ? everyone.find((p) => p.id === current.id) : undefined;
  const earlier = chosen ? askedBefore(captures, chosen.id, question) : undefined;
  const typedName = newName.trim().replace(/\s+/g, " ");
  const namesake = typedName ? everyone.find((p) => nameKey(p.name) === nameKey(typedName)) : undefined;

  const choose = (id: string) => {
    onChange([{ id }]);
    setShowPrevious(false);
    setMode("chosen");
  };

  const name = (value: string) => {
    setNewName(value);
    setMode("name");
  };

  const confirmName = () => {
    if (!typedName) return;
    onChange([{ name: typedName }]);
    onContinue();
  };

  return (
    <>
      <div className={flow.topbar}>
        <IconButton
          icon="back"
          label={mode === "name" ? "Back to people" : "Back to your question"}
          onClick={mode === "name" ? () => setMode("find") : onBack}
        />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.label} ${flow.enter}`}>Your question</p>
        <h1 className={`${flow.question} ${flow.questionLG}`}>{question}</h1>

        {mode === "find" && (
          <section className={`${styles.who} ${flow.enterLate}`} aria-labelledby="who-heading">
            <h2 id="who-heading" className={`serif ${styles.whoHeading}`}>
              Who are you asking?
            </h2>
            {onFew && <HowMany many={false} onChange={(many) => many && onFew()} />}
            <PersonPicker
              label="Who are you asking?"
              placeholder="Their name"
              onSelect={(p) => choose(p.id)}
              onCreate={name}
              onSomeoneNew={() => name("")}
            />
          </section>
        )}

        {mode === "name" && (
          <section className={`${styles.who} ${flow.enter}`} aria-labelledby="name-heading">
            <h2 id="name-heading" className={`serif ${styles.whoHeading}`}>
              What should we call them?
            </h2>
            <input
              className={styles.name}
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmName();
              }}
              placeholder="Their name"
              aria-label="What should we call them?"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={48}
            />
            <p className={styles.hint} aria-live="polite">
              {namesake ? (
                <>
                  You already have a {namesake.name}. A little more helps tell them apart, like “{namesake.name} from
                  work”.
                </>
              ) : typedName ? (
                <>
                  You’ll keep this as <strong>3&nbsp;Things from {typedName}</strong>.
                </>
              ) : (
                "A first name is enough. You can add a little context later."
              )}
            </p>
          </section>
        )}

        {mode === "chosen" && chosen && (
          <section className={`${styles.who} ${flow.enter}`} aria-label="Who you’re asking">
            <div className={styles.person}>
              <Avatar name={chosen.name} photo={chosen.photo} size="md" />
              <div className={styles.personText}>
                <p className={`serif ${styles.personName}`}>{chosen.name}</p>
                {chosen.note && <p className={styles.personNote}>{chosen.note}</p>}
              </div>
              <button type="button" className={styles.change} onClick={() => setMode("find")}>
                Change
              </button>
            </div>

            {/* Context, never a gate: what you've already asked them. */}
            <p className={styles.memory}>
              You’ve asked {chosen.name} {countWords(chosen.conversations.length, "question")} before
              {chosen.topics.length > 0 && (
                <>
                  , about <strong>{listOf(chosen.topics.slice(0, 3))}</strong>
                </>
              )}
              .
            </p>

            {earlier && (
              <div className={styles.similar}>
                <p>
                  You asked {chosen.name} something similar {onDay(earlier.recordedAt)}.
                </p>
                <p className={`serif ${styles.similarQuestion}`}>“{earlier.question}”</p>
                {showPrevious && (
                  <ol className={styles.previous}>
                    {earlier.things.map((t, i) => (
                      <li key={t.id}>
                        <span className="serif tabular">{i + 1}</span>
                        <span>{t.headline}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <button type="button" className={styles.viewPrevious} onClick={() => setShowPrevious((v) => !v)}>
                  {showPrevious ? "Hide previous" : "View previous"}
                </button>
                <p className={styles.bothKept}>People’s answers change. Both will be kept, each with its date.</p>
              </div>
            )}
          </section>
        )}
      </div>

      <div className={flow.footer}>
        {mode === "find" && (
          <Button block variant="text" size="md" onClick={onSkip}>
            {sending ? "Skip · make a link anyone can answer" : "Skip for now"}
          </Button>
        )}
        {mode === "name" && (
          <Button block onClick={confirmName} disabled={!typedName}>
            Continue
          </Button>
        )}
        {mode === "chosen" && (
          <Button block onClick={onContinue}>
            {earlier ? "Ask again" : "Continue"}
          </Button>
        )}
      </div>
    </>
  );
}
