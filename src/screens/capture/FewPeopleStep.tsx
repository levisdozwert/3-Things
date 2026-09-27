import { useMemo, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { PersonPicker } from "../../components/people/PersonPicker";
import { count, listOf } from "../../lib/format";
import { listPeople } from "../../lib/library";
import { isNew, nameKey, type Speaker } from "../../lib/people";
import { useStore } from "../../lib/store";
import flow from "./Flow.module.css";
import styles from "./WhoStep.module.css";

/** One person, or a few: the only choice about how many. Not a list builder. */
export function HowMany({ many, onChange }: { many: boolean; onChange: (many: boolean) => void }) {
  return (
    <div className={styles.howMany} role="radiogroup" aria-label="How many people">
      {[
        { value: false, label: "One person" },
        { value: true, label: "A few people" },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={many === o.value}
          className={styles.howManyOption}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface FewPeopleStepProps {
  question: string;
  chosen: Speaker[];
  onChange: (chosen: Speaker[]) => void;
  /** People this question already went to, left out of the suggestions. */
  alreadyAsked: { id: string; name: string }[];
  onOne: () => void;
  onSend: () => void;
  onBack: () => void;
}

const keyOf = (s: Speaker) => (isNew(s) ? `new:${nameKey(s.name)}` : s.id);

/**
 * The same question to a few people. Tap the people you'd like to hear from,
 * or add someone. Each of them will be asked on their own.
 */
export function FewPeopleStep({ question, chosen, onChange, alreadyAsked, onOne, onSend, onBack }: FewPeopleStepProps) {
  const { captures, people } = useStore();
  const everyone = useMemo(() => listPeople(captures, people), [captures, people]);
  const asked = new Set(alreadyAsked.map((p) => p.id));
  // A steady list: people you've asked recently, then anyone you add. Ticking never reorders it.
  const [pool, setPool] = useState<Speaker[]>(() => {
    const recent = everyone.filter((p) => !asked.has(p.id)).slice(0, 6).map((p) => ({ id: p.id }));
    const extra = chosen.filter((s) => !recent.some((r) => keyOf(r) === keyOf(s)));
    return [...recent, ...extra];
  });
  const [adding, setAdding] = useState(false);

  const picked = new Set(chosen.map(keyOf));
  const nameOf = (s: Speaker) => (isNew(s) ? s.name : (everyone.find((p) => p.id === s.id)?.name ?? ""));
  const toggle = (s: Speaker) =>
    onChange(picked.has(keyOf(s)) ? chosen.filter((c) => keyOf(c) !== keyOf(s)) : [...chosen, s]);
  const add = (s: Speaker) => {
    if (!pool.some((p) => keyOf(p) === keyOf(s))) setPool((p) => [...p, s]);
    if (!picked.has(keyOf(s))) onChange([...chosen, s]);
    setAdding(false);
  };

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back to your question" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <p className={`${flow.label} ${flow.enter}`}>Your question</p>
        <h1 className={`${flow.question} ${flow.questionLG}`}>{question}</h1>

        <section className={`${styles.who} ${flow.enterLate}`} aria-labelledby="few-heading">
          <h2 id="few-heading" className={`serif ${styles.whoHeading}`}>
            Who are you asking?
          </h2>
          <HowMany many onChange={(many) => !many && onOne()} />
          <p className={styles.hint}>Each person answers on their own. Their answers come back separately.</p>

          <ul className={styles.few} aria-label="People to ask">
            {pool.map((s) => {
              const on = picked.has(keyOf(s));
              const known = isNew(s) ? undefined : everyone.find((p) => p.id === s.id);
              return (
                <li key={keyOf(s)}>
                  <button type="button" className={styles.pick} aria-pressed={on} onClick={() => toggle(s)}>
                    <span className={styles.tick} aria-hidden="true">
                      {on && <Icon name="check" size={14} strokeWidth={2.4} />}
                    </span>
                    <Avatar name={nameOf(s)} photo={known?.photo} size="sm" />
                    <span className={styles.pickText}>
                      <span className={styles.pickName}>{nameOf(s)}</span>
                      <span className={styles.pickMeta}>
                        {known ? (known.note ?? count(known.conversations.length, "conversation")) : "New to your Library"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {adding ? (
            <div className={styles.addSomeone}>
              <PersonPicker
                label="Add someone"
                placeholder="Their name"
                autoFocus
                exclude={chosen.flatMap((s) => (isNew(s) ? [] : [s.id]))}
                onSelect={(p) => add({ id: p.id })}
                onCreate={(name) => add({ name })}
              />
            </div>
          ) : (
            <button type="button" className={styles.addButton} onClick={() => setAdding(true)}>
              <span className={styles.addPlus} aria-hidden="true">
                <Icon name="plus" size={16} strokeWidth={2} />
              </span>
              Add someone
            </button>
          )}

          {alreadyAsked.length > 0 && (
            <p className={styles.bothKept}>Already asked: {listOf(alreadyAsked.map((p) => p.name))}.</p>
          )}
        </section>
      </div>

      <div className={flow.footer}>
        <Button block icon="share" onClick={onSend} disabled={chosen.length === 0}>
          Send question
        </Button>
      </div>
    </>
  );
}
