import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Sheet } from "../components/Sheet";
import { relativeDay } from "../lib/format";
import { sentTo, sentWhen, stateLabel } from "../lib/remote/describe";
import { copyInvite, shareInvite } from "../lib/remote/invite";
import { answerLink, relayFor } from "../lib/remote/relay";
import { askerName, useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
import page from "./Collection.module.css";
import styles from "./SentScreen.module.css";

/**
 * One question you sent. Where it went, whether it came back, and a few
 * gentle things you can do: remind them (only when you choose), share the
 * link again, ask someone else too, or take it back.
 */
export function QuestionScreen() {
  const { id = "" } = useParams();
  const { getOutgoing, outgoing, people, getCapture, settings, updateOutgoing, removeOutgoing } = useStore();
  const navigate = useNavigate();
  const back = useBack("/sent");
  const question = getOutgoing(decodeURIComponent(id));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  if (!question) {
    return (
      <main className={page.page}>
        <div className={page.missing}>
          <p className="serif">This question isn’t here anymore.</p>
          <Link to="/sent" viewTransition>
            Questions you’ve sent
          </Link>
        </div>
      </main>
    );
  }

  const name = sentTo(question, people);
  const answers = question.answers.flatMap((a) => getCapture(a) ?? []);
  const waiting = question.state !== "answered";
  const invite = { asker: askerName(settings), question: question.question, link: answerLink(question.id) };
  const alsoSent = outgoing.filter((o) => o.group === question.group && o.id !== question.id);

  const remind = async () => {
    const result = await shareInvite({ ...invite, reminder: true });
    if (result === "shared" || result === "copied") {
      updateOutgoing(question.id, { remindedAt: new Date().toISOString() });
      setFeedback(result === "copied" ? "Reminder copied" : "Reminder sent");
    }
  };

  return (
    <main className={page.page}>
      <div className={page.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
      </div>

      <header className={page.header}>
        <p className={styles.status}>
          {name
            ? waiting
              ? `Waiting for ${name}`
              : `${name} answered`
            : `Anyone with the link · ${answers.length ? `${answers.length} answered` : "no answers yet"}`}
        </p>
        <h1 className={`serif ${styles.hero}`}>{question.question}</h1>
        <p className={styles.when}>
          {sentWhen(question.sentAt)}
          {name && question.state === "opened" && ` · ${stateLabel(question)}`}
          {question.remindedAt && ` · Reminded ${relativeDay(question.remindedAt).toLowerCase()}`}
        </p>
      </header>

      {answers.length > 0 && (
        <section className={styles.actions}>
          {answers.map((c) => (
            <Button key={c.id} variant="quiet" size="md" onClick={() => navigate(`/library/${c.id}`, { viewTransition: true })}>
              See {c.person}’s 3
            </Button>
          ))}
          {answers.length > 1 && (
            <p className={styles.quietNote}>Each answer stays separate, in their own words.</p>
          )}
        </section>
      )}

      {(waiting || !name) && (
        <section className={styles.actions}>
          {name && waiting && (
            <Button variant="quiet" size="md" icon="share" onClick={() => void remind()}>
              Send a reminder
            </Button>
          )}
          <div className={styles.links}>
            <button
              type="button"
              className={styles.link}
              onClick={async () => setFeedback((await copyInvite(invite, { linkOnly: true })) === "copied" ? "Link copied" : "Couldn’t copy")}
            >
              Copy link
            </button>
            <Link to={`/a/${encodeURIComponent(question.id)}?preview=1`} viewTransition className={styles.link}>
              See what {name || "they"} will see
            </Link>
          </div>
          <p className={styles.quietNote} aria-live="polite">
            {feedback ?? (name ? "Reminders only go when you send one. Nothing nudges them automatically." : "")}
          </p>
        </section>
      )}

      <section className={styles.section}>
        {alsoSent.length > 0 && (
          <>
            <h2 className={page.label}>Also asked</h2>
            <ul className={styles.people}>
              {alsoSent.map((o) => {
                const other = sentTo(o, people);
                return (
                  <li key={o.id}>
                    <Link to={`/sent/${encodeURIComponent(o.id)}`} viewTransition className={styles.person}>
                      <Avatar name={other} size="sm" />
                      <span className={styles.personText}>
                        <span className={styles.personName}>{other || "Anyone with the link"}</span>
                        <span className={styles.meta}>{stateLabel(o)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className={styles.links}>
          <Link
            to={`/ask?q=${encodeURIComponent(question.question)}&send=1&group=${encodeURIComponent(question.group)}`}
            viewTransition
            className={styles.link}
          >
            Ask someone else too
          </Link>
        </div>
      </section>

      <div className={styles.remove}>
        <button type="button" onClick={() => setConfirmDelete(true)}>
          Delete this question
        </button>
      </div>

      <Sheet
        open={confirmDelete}
        title="Delete this question?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={async () => {
                await relayFor(question.via)
                  .remove(question.id, question.ownerKey)
                  .catch(() => undefined);
                removeOutgoing(question.id);
                navigate("/sent", { replace: true, viewTransition: true });
              }}
            >
              Delete question
            </Button>
            <Button variant="text" size="md" block onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </>
        }
      >
        {name ? `${name} won’t be able to answer it anymore.` : "Nobody will be able to answer it anymore."} The link
        will say it’s no longer available.{answers.length > 0 && " Answers you already have stay in your Library."}
      </Sheet>
    </main>
  );
}
