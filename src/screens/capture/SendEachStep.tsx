import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { listOf } from "../../lib/format";
import flow from "./Flow.module.css";
import styles from "./SendSteps.module.css";

export interface Recipient {
  key: string;
  name: string;
  photo?: string;
}

export interface Delivery {
  state: "sending" | "shared" | "copied" | "failed";
  /** Shown when this browser couldn't share or copy: their link, to send by hand. */
  link?: string;
}

interface SendEachStepProps {
  question: string;
  recipients: Recipient[];
  deliveries: Record<string, Delivery>;
  askerName: string;
  onAskerName: (name: string) => void;
  keepsAudio: boolean;
  problem: string | null;
  onSend: (key: string, how: "share" | "copy") => void;
  onDone: () => void;
  onBack: () => void;
}

/**
 * The same question, sent one person at a time. Everyone gets a link of their
 * own and a question asked just of them: "Levis asked you for 3", never
 * "Levis asked 7 people". Nobody sees who else was asked.
 */
export function SendEachStep({
  question,
  recipients,
  deliveries,
  askerName,
  onAskerName,
  keepsAudio,
  problem,
  onSend,
  onDone,
  onBack,
}: SendEachStepProps) {
  const [needsName] = useState(!askerName.trim());
  const signed = askerName.trim();
  const first = recipients[0]?.name ?? "They";
  const sent = recipients.filter((r) => ["shared", "copied", "failed"].includes(deliveries[r.key]?.state ?? ""));
  const unsent = recipients.filter((r) => !sent.includes(r));

  return (
    <>
      <div className={flow.topbar}>
        <IconButton icon="back" label="Back" onClick={onBack} />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <h1 className={`serif ${styles.title} ${flow.enter}`}>
          {recipients.length === 1 ? `Send this to ${first}` : "Send it to each of them"}
        </h1>
        <p className={`${flow.question} ${flow.questionLG} ${styles.quoted}`}>“{question}”</p>

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
            Each person gets a link of their own.{" "}
            {signed ? (
              <>
                {first} will see <strong>“{signed} asked you for 3”</strong>
              </>
            ) : (
              <>{first} will see your name</>
            )}{" "}
            and the question, and can answer by voice. Nobody sees who else you asked.
          </p>

          <ul className={styles.each} aria-label="Who you’re asking">
            {recipients.map((r) => {
              const d = deliveries[r.key];
              const done = d && d.state !== "sending";
              return (
                <li key={r.key} className={styles.eachRow}>
                  <div className={styles.eachMain}>
                    <Avatar name={r.name} photo={r.photo} size="sm" />
                    <span className={styles.eachText}>
                      <span className={styles.eachName}>{r.name}</span>
                      <span className={styles.eachMeta}>
                        {!d || d.state === "sending"
                          ? "Not sent yet"
                          : d.state === "copied"
                            ? "Link copied"
                            : d.state === "failed"
                              ? "Ready to send"
                              : "Sent"}
                      </span>
                    </span>
                    {done ? (
                      <span className={styles.eachDone}>
                        <Icon name="check" size={14} strokeWidth={2.4} />
                        <span className="visually-hidden">Sent</span>
                      </span>
                    ) : (
                      <Button
                        variant="quiet"
                        size="sm"
                        icon="share"
                        disabled={!signed || d?.state === "sending"}
                        onClick={() => onSend(r.key, "share")}
                      >
                        Send
                      </Button>
                    )}
                  </div>
                  {d?.state === "failed" && d.link && (
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Copy this link and send it to {r.name}</span>
                      <input className={styles.linkBox} value={d.link} readOnly onFocus={(e) => e.target.select()} />
                    </label>
                  )}
                  {!done && (
                    <button
                      type="button"
                      className={styles.eachCopy}
                      disabled={!signed || d?.state === "sending"}
                      onClick={() => onSend(r.key, "copy")}
                    >
                      Copy {r.name}’s link instead
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <p className={styles.line}>
            Each answer comes back only to you, after that person has reviewed it.
            {keepsAudio && " Each of them decides whether you can keep their recording."}
          </p>
          {problem && (
            <p className={styles.problem} role="alert">
              {problem}
            </p>
          )}
        </div>
      </div>

      <div className={flow.footer}>
        {sent.length > 0 && unsent.length > 0 && (
          <p className={styles.footNote}>{listOf(unsent.map((r) => r.name))} won’t be asked unless you send it.</p>
        )}
        <Button block variant={unsent.length === 0 ? "ember" : "ink"} onClick={onDone} disabled={sent.length === 0}>
          {unsent.length === 0 ? "See your question" : "Done"}
        </Button>
      </div>
    </>
  );
}
