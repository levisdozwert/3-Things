import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { count } from "../lib/format";
import { isWaiting, sentTo, sentWhen, stateLabel } from "../lib/remote/describe";
import { useStore } from "../lib/store";
import type { Outgoing } from "../lib/types";
import { useBack } from "../lib/useBack";
import page from "./Collection.module.css";
import styles from "./SentScreen.module.css";

/**
 * What you've asked people who weren't with you, and whether it came back.
 * Just enough to remember what you sent: not a task list, not an inbox.
 */
export function SentScreen() {
  const { outgoing, people, getCapture } = useStore();
  const navigate = useNavigate();
  const back = useBack("/library");

  // The same question sent to several people stays together; each answer stays its own.
  const groups = new Map<string, Outgoing[]>();
  for (const o of outgoing) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  // By question: one question sent to four people is one question waiting.
  const waiting = new Set(outgoing.filter(isWaiting).map((o) => o.group)).size;

  return (
    <main className={page.page}>
      <div className={page.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
      </div>

      <header className={page.header}>
        <h1 className={`serif ${page.name}`}>Questions you’ve sent</h1>
        <p className={`serif ${page.learned}`}>
          {outgoing.length === 0
            ? "Nothing sent yet."
            : waiting > 0
              ? `${count(waiting, "question")} waiting for answers.`
              : "Everything you’ve sent has come back."}
        </p>
      </header>

      {outgoing.length === 0 ? (
        <div className={styles.empty}>
          <p>When you send someone a question, it waits here until they answer.</p>
          <Button icon="mic" onClick={() => navigate("/ask", { viewTransition: true })}>
            Ask for 3
          </Button>
        </div>
      ) : (
        [...groups.values()].map((group) => (
          <section key={group[0].group} className={styles.group}>
            {group.length > 1 ? (
              // Asked of several people: the question has its own page, with everyone's answers.
              <Link
                to={`/library/questions/${encodeURIComponent(group[0].group)}`}
                viewTransition
                className={`serif ${styles.question} ${styles.questionLink}`}
              >
                {group[0].question}
              </Link>
            ) : (
              <p className={`serif ${styles.question}`}>{group[0].question}</p>
            )}
            <ul className={styles.people}>
              {[...group].reverse().map((o) => {
                const name = sentTo(o, people);
                const answers = o.answers.flatMap((id) => getCapture(id) ?? []);
                const one = name && answers.length === 1 ? answers[0] : null;
                return (
                  <li key={o.id}>
                    <Link
                      to={one ? `/library/${one.id}` : `/sent/${encodeURIComponent(o.id)}`}
                      viewTransition
                      className={styles.person}
                    >
                      <Avatar name={name} size="sm" />
                      <span className={styles.personText}>
                        <span className={styles.personName}>{name || "Anyone with the link"}</span>
                        <span className={styles.meta}>
                          {name
                            ? `${stateLabel(o)} · ${sentWhen(o.sentAt)}`
                            : `${answers.length ? count(answers.length, "answer") : "No answers yet"} · ${sentWhen(o.sentAt)}`}
                        </span>
                      </span>
                      {one ? (
                        <span className={styles.see}>See {name}’s 3</span>
                      ) : (
                        <Icon name="forward" size={18} className={styles.chevron} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
