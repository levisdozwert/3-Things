import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { PerspectivesShareSheet } from "../components/PerspectivesShareSheet";
import { Sheet } from "../components/Sheet";
import { calendarDate } from "../lib/format";
import { basisOf, readPerspectives, stillValid } from "../lib/perspectives/read";
import { answerNames, findQuestion, namesOf } from "../lib/questions";
import { useStore } from "../lib/store";
import type { Capture, PerspectiveTheme, Thing } from "../lib/types";
import { useBack } from "../lib/useBack";
import page from "./Collection.module.css";
import styles from "./Questions.module.css";

const two = (n: number) => String(n).padStart(2, "0");

interface Member {
  capture: Capture;
  thing: Thing;
  name: string;
  angle?: string;
}

/**
 * How different people answered the same question.
 *
 * Human first: each person's three things, stacked, in their own words. Then,
 * on top of them and always traceable back to them, where they overlap, where
 * they see it differently, and what only one person mentioned. Nothing here
 * decides whose answer is best, and nothing changes what anyone said.
 */
export function PerspectivesScreen() {
  const { group = "" } = useParams();
  const key = decodeURIComponent(group);
  const back = useBack(`/library/questions/${encodeURIComponent(key)}`);
  const { captures, outgoing, people, getPerson, perspectives, savePerspectives, markSeen } = useStore();
  const question = useMemo(() => findQuestion(key, captures, outgoing, people), [key, captures, outgoing, people]);
  const answers = useMemo(() => question?.answers ?? [], [question]);
  const [only, setOnly] = useState<string | null>(null);
  const [tracing, setTracing] = useState<PerspectiveTheme | null>(null);
  const [sharing, setSharing] = useState(false);
  const [reading, setReading] = useState(false);

  const stored = perspectives[key];
  const basis = basisOf(answers);
  const current = stored?.basis === basis ? stored : undefined;

  // Read once for these answers; again only when an answer arrives or changes.
  useEffect(() => {
    if (!question || answers.length < 2 || current) return;
    let alive = true;
    setReading(true);
    void readPerspectives(question.question, answers, stored)
      .then((reading) => alive && savePerspectives(key, reading))
      .finally(() => alive && setReading(false));
    return () => {
      alive = false;
    };
    // `stored` is only a starting point; the basis decides when to read again.
  }, [basis, key]);

  // Everything is here to read: nothing is new anymore.
  useEffect(() => {
    answers.filter((c) => c.unseen).forEach((c) => markSeen(c.id));
  }, [answers, markSeen]);

  if (!question || answers.length < 2) {
    return (
      <main className={page.page}>
        <div className={page.missing}>
          <p className="serif">{question ? "Perspectives appear once two people have answered." : "This question isn’t here anymore."}</p>
          <Link to={question ? `/library/questions/${encodeURIComponent(key)}` : "/library"} viewTransition>
            {question ? "Back to the question" : "Back to your 3 Things"}
          </Link>
        </div>
      </main>
    );
  }

  const names = answerNames(answers, calendarDate);
  const nameFor = new Map(answers.map((c, i) => [c.id, names[i]]));
  const photoOf = (c: Capture) => ((c.personIds ?? []).length === 1 ? getPerson(c.personIds![0])?.photo : undefined);

  const themes = stillValid(current?.themes ?? [], answers);
  const position = (m: { captureId: string; thingId: string }) => {
    const a = answers.findIndex((c) => c.id === m.captureId);
    const t = answers[a]?.things.findIndex((x) => x.id === m.thingId) ?? 0;
    return a * 10 + t;
  };
  // In the order the ideas appear in their answers: never by how many people said them.
  const ordered = [...themes].sort((x, y) => Math.min(...x.members.map(position)) - Math.min(...y.members.map(position)));
  const membersOf = (t: PerspectiveTheme): Member[] =>
    t.members.flatMap((m) => {
      const capture = answers.find((c) => c.id === m.captureId);
      const thing = capture?.things.find((x) => x.id === m.thingId);
      return capture && thing ? [{ capture, thing, name: nameFor.get(capture.id) ?? "", angle: m.angle }] : [];
    });

  const involves = (t: PerspectiveTheme) => !only || t.members.some((m) => m.captureId === only);
  const overlaps = ordered.filter((t) => t.kind !== "different" && involves(t));
  const takes = ordered.filter((t) => t.kind === "different" && involves(t));
  const connected = new Set(themes.flatMap((t) => t.members.map((m) => `${m.captureId}:${m.thingId}`)));
  const shown = only ? answers.filter((c) => c.id === only) : answers;
  const unique = shown.flatMap((c) => c.things.filter((t) => !connected.has(`${c.id}:${t.id}`)).map((thing) => ({ capture: c, thing })));
  const onlyName = only ? nameFor.get(only) : undefined;

  const whoLine = (t: PerspectiveTheme) => {
    const who = namesOf([...new Set(membersOf(t).map((m) => m.name))], 3);
    return t.kind === "same" ? `Mentioned by ${who}` : `Connected ideas from ${who}`;
  };

  return (
    <main className={page.page}>
      <div className={page.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
        <IconButton icon="share" label="Share these perspectives" onClick={() => setSharing(true)} />
      </div>

      <header className={styles.header}>
        <p className={page.label}>Perspectives</p>
        <h1 className={`serif ${styles.hero}`}>{question.question}</h1>
        <p className={styles.from}>
          <span className={styles.faces} aria-hidden="true">
            {answers.slice(0, 5).map((c) => (
              <Avatar key={c.id} name={c.person} photo={photoOf(c)} size="sm" />
            ))}
          </span>
          <span>From {namesOf(names, 4)}</span>
        </p>
      </header>

      <div className={styles.filter} role="group" aria-label="Show perspectives from">
        <button type="button" className={styles.chip} aria-pressed={only === null} onClick={() => setOnly(null)}>
          All
        </button>
        {answers.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.chip}
            aria-pressed={only === c.id}
            onClick={() => setOnly(only === c.id ? null : c.id)}
          >
            {nameFor.get(c.id)}
          </button>
        ))}
      </div>

      {/* Their own three things, one person at a time, in the order they arrived. */}
      <section className={styles.voices} aria-label="What each person said">
        {shown.map((c) => (
          <article key={c.id} className={styles.voice} aria-label={`${nameFor.get(c.id)}’s answer`}>
            <div className={styles.voiceHead}>
              <Avatar name={c.person} photo={photoOf(c)} size="md" />
              <div>
                <p className={`serif ${styles.voiceName}`}>{nameFor.get(c.id)}</p>
                <p className={styles.voiceMeta}>
                  {calendarDate(c.recordedAt)} · {c.remote ? "by link" : "in person"}
                </p>
              </div>
              <Link to={`/library/${c.id}`} viewTransition className={styles.voiceOpen}>
                Open
              </Link>
            </div>
            <ol className={styles.answerThings}>
              {c.things.map((t, i) => (
                <li key={t.id}>
                  <span className="serif tabular" aria-hidden="true">
                    {two(i + 1)}
                  </span>
                  <span className="serif">{t.headline}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      {reading && !current ? (
        <p className={styles.reading} role="status">
          <span className={styles.readingDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Reading their answers side by side
        </p>
      ) : (
        <>
          <section className={styles.part} aria-labelledby="overlap-heading">
            <h2 id="overlap-heading" className={`serif ${styles.partTitle}`}>
              Where they overlap
            </h2>
            {overlaps.length > 0 ? (
              <>
                <p className={styles.partNote}>
                  {onlyName ? `Where ${onlyName}’s answer meets someone else’s.` : "Ideas that came up more than once."} Tap one to see
                  what each person said.
                </p>
                <div className={styles.themes}>
                  {overlaps.map((t) => (
                    <button key={`${t.kind}-${t.label}`} type="button" className={styles.theme} onClick={() => setTracing(t)}>
                      <span className={`serif ${styles.themeLabel}`}>{t.label}</span>
                      <span className={styles.themeWho}>{whoLine(t)}</span>
                      {t.note && <span className={styles.themeNote}>{t.note}</span>}
                      <span className={styles.angles}>
                        {membersOf(t).map((m) => (
                          <span
                            key={`${m.capture.id}-${m.thing.id}`}
                            className={`${styles.angle} ${only === m.capture.id ? styles.angleSelected : ""}`}
                          >
                            <Avatar name={m.capture.person} photo={photoOf(m.capture)} size="xs" />
                            <span className={styles.angleWho}>
                              <span className={styles.angleName}>{m.name}</span>
                              <span className={styles.angleText}>{m.angle ?? m.thing.headline}</span>
                            </span>
                          </span>
                        ))}
                      </span>
                      <span className={styles.traceHint}>
                        See what each said <Icon name="forward" size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className={styles.nothingShared}>
                {onlyName
                  ? `Nothing ${onlyName} said came up in anyone else’s answer.`
                  : "Nobody said quite the same thing. Every answer here is its own."}
              </p>
            )}
          </section>

          {takes.length > 0 && (
            <section className={styles.part} aria-labelledby="takes-heading">
              <h2 id="takes-heading" className={`serif ${styles.partTitle}`}>
                Different takes
              </h2>
              <p className={styles.partNote}>Where they see the same thing differently. Each view stays theirs.</p>
              <div className={styles.themes}>
                {takes.map((t) => (
                  <button key={`${t.kind}-${t.label}`} type="button" className={styles.theme} onClick={() => setTracing(t)}>
                    <span className={`serif ${styles.themeLabel}`}>{t.label}</span>
                    <span className={styles.takeSides}>
                      {membersOf(t).map((m) => (
                        <span key={`${m.capture.id}-${m.thing.id}`} className={styles.side}>
                          <span className={styles.sideName}>
                            <Avatar name={m.capture.person} photo={photoOf(m.capture)} size="xs" />
                            {m.name}
                          </span>
                          <span className={styles.sideText}>
                            {m.angle ?? m.thing.headline}
                          </span>
                        </span>
                      ))}
                    </span>
                    <span className={styles.traceHint}>
                      See what each said <Icon name="forward" size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {unique.length > 0 && (
            <section className={styles.part} aria-labelledby="unique-heading">
              <h2 id="unique-heading" className={`serif ${styles.partTitle}`}>
                {onlyName ? `Only ${onlyName} mentioned` : "What only one person mentioned"}
              </h2>
              <p className={styles.partNote}>Just as worth keeping as anything that came up twice.</p>
              <ul className={styles.unique}>
                {unique.map(({ capture, thing }) => (
                  <li key={thing.id}>
                    <Link to={`/library/${capture.id}`} state={{ focus: thing.id }} viewTransition className={styles.uniqueRow}>
                      <span className={`serif ${styles.uniqueThing}`}>{thing.headline}</span>
                      <span className={styles.uniqueWho}>{nameFor.get(capture.id)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className={styles.about}>
            3 Things noticed these connections to help you read across the answers. It doesn’t decide who’s right, and
            everyone’s answer stays exactly as they gave it.
            {current?.by === "preview" &&
              " In this preview, without the editor connected, only answers that name the same thing are connected."}
          </p>
        </>
      )}

      <Sheet
        open={tracing !== null}
        title={tracing?.label ?? ""}
        onClose={() => setTracing(null)}
        actions={
          <Button variant="text" size="md" block onClick={() => setTracing(null)}>
            Close
          </Button>
        }
      >
        {tracing && (
          <div className={styles.trace}>
            <p className={styles.traceKind}>
              {tracing.kind === "different" ? "Different takes. Each in their own words." : whoLine(tracing)}
              {tracing.note && <> · {tracing.note}</>}
            </p>
            {membersOf(tracing).map((m) => (
              <div key={`${m.capture.id}-${m.thing.id}`} className={styles.traceItem}>
                <p className={styles.traceWho}>
                  <Avatar name={m.capture.person} photo={photoOf(m.capture)} size="xs" />
                  <span>{m.name}</span>
                  <span>{m.capture.remote ? "in the answer they sent" : "in your conversation"}</span>
                </p>
                <p className={`serif ${styles.traceHeadline}`}>{m.thing.headline}</p>
                {m.thing.detail && <p className={styles.traceDetail}>{m.thing.detail}</p>}
                {m.thing.said && (
                  <blockquote className={styles.traceSaid}>
                    “{m.thing.said}”
                  </blockquote>
                )}
                <Link
                  to={`/library/${m.capture.id}`}
                  state={{ focus: m.thing.id }}
                  viewTransition
                  className={styles.traceLink}
                  onClick={() => setTracing(null)}
                >
                  All of {m.name}’s 3
                </Link>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <PerspectivesShareSheet
        open={sharing}
        question={question.question}
        answers={answers}
        names={names}
        onClose={() => setSharing(false)}
      />
    </main>
  );
}
