import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { ConversationRow, PersonRow, QuestionRow, ThingRow, TopicRow } from "../components/library/Rows";
import rows from "../components/library/Library.module.css";
import { MergeSheet } from "../components/people/MergeSheet";
import { count, daysAgo } from "../lib/format";
import {
  listPeople,
  listPlaces,
  listTopics,
  matchesAll,
  mentionLine,
  searchLibrary,
  type Person,
  type SearchResults,
} from "../lib/library";
import { likelyDuplicates } from "../lib/people";
import { listQuestions, type QuestionCollection } from "../lib/questions";
import { isWaiting } from "../lib/remote/describe";
import { starterQuestions } from "../lib/samples";
import { useStore } from "../lib/store";
import type { Capture } from "../lib/types";
import styles from "./LibraryScreen.module.css";

type View = "recent" | "people" | "topics";
const VIEWS: { id: View; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "people", label: "People" },
  { id: "topics", label: "Topics" },
];

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.group}>
        {title}
        {count !== undefined && <span className={styles.groupCount}>{count}</span>}
      </h2>
      <ul className={rows.list}>{children}</ul>
    </section>
  );
}

/** Search results, a few of each at first, so even a large Library stays calm. */
function Results({ results, questions }: { results: SearchResults; questions: QuestionCollection[] }) {
  const [open, setOpen] = useState<string[]>([]);
  const shown = <T,>(key: string, items: T[], limit: number) => (open.includes(key) ? items : items.slice(0, limit));
  const more = (key: string, total: number, limit: number) =>
    total > limit &&
    !open.includes(key) && (
      <li>
        <button type="button" className={styles.more} onClick={() => setOpen((o) => [...o, key])}>
          Show all {total}
        </button>
      </li>
    );

  return (
    <div aria-live="polite">
      {results.broadened && (
        <p className={styles.broadened}>
          Nothing mentions all of that yet. Showing what you have about <strong>{results.broadened}</strong>.
        </p>
      )}
      {results.people.length > 0 && (
        <Section title="People" count={results.people.length}>
          {shown("people", results.people, 4).map((r) => (
            <PersonRow key={r.person.key} person={r.person} terms={results.terms} note={mentionLine(r)} />
          ))}
          {more("people", results.people.length, 4)}
        </Section>
      )}
      {results.questions.length + questions.length > 0 && (
        <Section title="Questions" count={results.questions.length + questions.length}>
          {/* A question several people answered, then each of their answers on its own. */}
          {questions.map((q) => (
            <QuestionRow key={q.key} question={q} terms={results.terms} />
          ))}
          {shown("questions", results.questions, 4).map((c) => (
            <ConversationRow key={c.id} capture={c} terms={results.terms} />
          ))}
          {more("questions", results.questions.length, 4)}
        </Section>
      )}
      {results.things.length > 0 && (
        <Section title="Things" count={results.things.length}>
          {shown("things", results.things, 5).map(({ capture, thing }) => (
            <ThingRow key={thing.id} capture={capture} thing={thing} terms={results.terms} />
          ))}
          {more("things", results.things.length, 5)}
        </Section>
      )}
    </div>
  );
}

type Entry = { at: string; capture: Capture; question?: never } | { at: string; question: QuestionCollection; capture?: never };

/**
 * Recent conversations, newest first. A question several people answered is
 * one entry, "4 perspectives", dated by its latest answer; each answer is
 * still on its person's page, in its topic, and in search.
 */
function Recent({ captures, questions }: { captures: Capture[]; questions: QuestionCollection[] }) {
  const together = new Set(questions.flatMap((q) => q.answers.map((c) => c.id)));
  const entries: Entry[] = [
    ...captures.filter((c) => !together.has(c.id)).map((capture) => ({ at: capture.recordedAt, capture })),
    ...questions.map((question) => ({ at: question.answers[question.answers.length - 1].recordedAt, question })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const groups: { title: string; items: Entry[] }[] = [
    { title: "Today", items: entries.filter((e) => daysAgo(e.at) <= 0) },
    { title: "This week", items: entries.filter((e) => daysAgo(e.at) > 0 && daysAgo(e.at) <= 6) },
    { title: "Earlier", items: entries.filter((e) => daysAgo(e.at) > 6) },
  ];
  return (
    <>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <Section key={g.title} title={g.title}>
            {g.items.map((e) =>
              e.question ? <QuestionRow key={e.question.key} question={e.question} /> : <ConversationRow key={e.capture.id} capture={e.capture} />,
            )}
          </Section>
        ))}
    </>
  );
}

/**
 * Your 3 Things: everything people have taught you, organized the way you
 * remember it. By when, by who, and by what it was about.
 */
export function LibraryScreen() {
  const { captures, people: records, separate, mergePeople, keepSeparate, outgoing } = useStore();
  // By question: one question sent to four people is one question waiting.
  const waiting = new Set(outgoing.filter(isWaiting).map((o) => o.group)).size;
  const [merging, setMerging] = useState<[Person, Person] | null>(null);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [focused, setFocused] = useState(false);

  const view = VIEWS.find((v) => v.id === params.get("view"))?.id ?? "recent";
  const query = params.get("q") ?? "";
  const keptOnly = params.get("kept") === "1";

  const update = (next: { view?: View; q?: string; kept?: boolean }) => {
    const merged = { view, q: query, kept: keptOnly, ...next };
    const out: Record<string, string> = {};
    if (merged.view !== "recent") out.view = merged.view;
    if (merged.q) out.q = merged.q;
    if (merged.kept && merged.view === "recent") out.kept = "1";
    setParams(out, { replace: true });
  };

  const people = useMemo(() => listPeople(captures, records), [captures, records]);
  // Only when it's very likely one person entered twice. Never a cleanup tool.
  const duplicate = useMemo(() => likelyDuplicates(people, separate)[0], [people, separate]);
  const topics = useMemo(() => listTopics(captures), [captures]);
  const places = useMemo(() => listPlaces(captures), [captures]);
  const results = useMemo(() => searchLibrary(captures, query, records), [captures, query, records]);
  // Questions several people answered, as questions in their own right.
  const shared = useMemo(
    () => listQuestions(captures, outgoing, records).filter((q) => q.answers.length >= 2),
    [captures, outgoing, records],
  );
  const sharedFound = useMemo(
    () => shared.filter((q) => matchesAll(`${q.question} ${q.topic} ${q.place ?? ""}`, results.terms)),
    [shared, results.terms],
  );

  const things = captures.reduce((n, c) => n + c.things.length, 0);
  const kept = captures.filter((c) => c.keptClose);
  const unnamed = captures.filter((c) => !c.person.trim()).length;
  const searching = query.trim().length > 0;
  const suggestions = [places[0], people[0]?.name, topics[0]?.name].filter(Boolean) as string[];

  if (captures.length === 0) {
    return (
      <main className={styles.library}>
        <h1 className={`serif ${styles.title}`}>Your 3 Things</h1>
        <div className={styles.empty}>
          <ol className={styles.emptyPositions} aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <span className="serif">{n}</span>
                <span className={styles.emptyLine} />
              </li>
            ))}
          </ol>
          <h2 className={`serif ${styles.emptyTitle}`}>Your Library grows one conversation at a time.</h2>
          <p className={styles.emptyText}>Ask someone something worth remembering.</p>
          <Button icon="mic" onClick={() => navigate("/ask", { viewTransition: true })}>
            Ask for 3
          </Button>
          <div className={styles.emptyExamples}>
            <p className={styles.group}>Try asking someone</p>
            <ul>
              {starterQuestions.map((q) => (
                <li key={q}>
                  <Link to={`/ask?q=${encodeURIComponent(q)}`} viewTransition className="serif">
                    “{q}”
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    );
  }

  const nothingFound =
    searching && results.people.length + results.questions.length + results.things.length + sharedFound.length === 0;

  return (
    <main className={styles.library}>
      <header className={styles.header}>
        <h1 className={`serif ${styles.title}`}>Your 3 Things</h1>
        <p className={styles.summary}>
          {people.length > 0 ? (
            <>
              You’ve learned <strong>{things} {things === 1 ? "thing" : "things"}</strong> from{" "}
              <strong>
                {people.length} {people.length === 1 ? "person" : "people"}
              </strong>
              .
            </>
          ) : (
            <>
              You’ve kept <strong>{things} {things === 1 ? "thing" : "things"}</strong> so far.
            </>
          )}
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.search}>
          <Icon name="search" size={20} />
          <input
            type="search"
            value={query}
            onChange={(e) => update({ q: e.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search people, questions or things"
            aria-label="Search people, questions or things"
            enterKeyHint="search"
            autoComplete="off"
          />
          {searching && (
            <button type="button" className={styles.clear} onClick={() => update({ q: "" })} aria-label="Clear search">
              <Icon name="close" size={16} strokeWidth={2} />
            </button>
          )}
        </label>

        {!searching && focused && suggestions.length > 0 && (
          <p className={styles.suggest}>
            <span>Try</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                // Keep focus in the field so the keyboard stays up.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => update({ q: s })}
              >
                {s}
              </button>
            ))}
          </p>
        )}

        {!searching && (
          <div className={styles.views} role="tablist" aria-label="Organize by">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`${styles.view} ${view === v.id ? styles.viewOn : ""}`}
                onClick={() => update({ view: v.id, kept: false })}
              >
                {v.label}
              </button>
            ))}
            {view === "recent" && kept.length > 0 && (
              <button
                type="button"
                className={`${styles.keptChip} ${keptOnly ? styles.keptChipOn : ""}`}
                aria-pressed={keptOnly}
                onClick={() => update({ kept: !keptOnly })}
              >
                <Icon name={keptOnly ? "bookmarked" : "bookmark"} size={16} strokeWidth={1.7} />
                <span className={styles.keptLabel}>Kept close</span>
              </button>
            )}
          </div>
        )}
      </div>

      {searching ? (
        nothingFound ? (
          <div className={styles.noResults}>
            <p className="serif">Nothing here yet</p>
            <p>
              Try another word or{" "}
              <Link to="/ask" viewTransition>
                ask someone about it
              </Link>
              .
            </p>
          </div>
        ) : (
          <Results key={query} results={results} questions={sharedFound} />
        )
      ) : view === "people" ? (
        <>
          {duplicate && (
            <div className={styles.duplicate}>
              <p className={styles.duplicateTitle}>Are these the same person?</p>
              <div className={styles.duplicatePeople}>
                {duplicate.map((p) => (
                  <span key={p.id} className={styles.duplicatePerson}>
                    <Avatar name={p.name} photo={p.photo} size="sm" />
                    <span>
                      <strong>{p.name}</strong>
                      <span>{count(p.conversations.length, "conversation")}</span>
                    </span>
                  </span>
                ))}
              </div>
              <div className={styles.duplicateActions}>
                <Button variant="quiet" size="sm" onClick={() => setMerging(duplicate)}>
                  Merge
                </Button>
                <button type="button" className={styles.more} onClick={() => keepSeparate(duplicate[0].id, duplicate[1].id)}>
                  Keep separate
                </button>
              </div>
            </div>
          )}
          <ul className={`${rows.list} ${styles.firstList}`}>
            {people.map((p) => (
              <PersonRow key={p.key} person={p} />
            ))}
          </ul>
          {unnamed > 0 && (
            <p className={styles.footnote}>
              And {unnamed} {unnamed === 1 ? "conversation" : "conversations"} without a name.
            </p>
          )}
        </>
      ) : view === "topics" ? (
        <>
          <ul className={`${rows.list} ${styles.firstList}`}>
            {topics.map((t) => (
              <TopicRow key={t.key} topic={t} />
            ))}
          </ul>
          {places.length > 0 && (
            <p className={styles.places}>
              <span>Places</span>
              {places.map((place) => (
                <button key={place} type="button" onClick={() => update({ q: place })}>
                  {place}
                </button>
              ))}
            </p>
          )}
        </>
      ) : (
        <>
          {outgoing.length > 0 && !keptOnly && (
            <Link to="/sent" viewTransition className={styles.sentLink}>
              <Icon name="share" size={16} strokeWidth={1.8} />
              <span>
                {waiting > 0
                  ? `${waiting} ${waiting === 1 ? "question" : "questions"} waiting for answers`
                  : "Questions you’ve sent"}
              </span>
              <Icon name="forward" size={16} />
            </Link>
          )}
          <Recent captures={keptOnly ? kept : captures} questions={keptOnly ? [] : shared} />
        </>
      )}

      {merging && (
        <MergeSheet
          open
          first={merging[0]}
          second={merging[1]}
          onClose={() => setMerging(null)}
          onKeepSeparate={() => {
            keepSeparate(merging[0].id, merging[1].id);
            setMerging(null);
          }}
          onMerge={(fromId, intoId) => {
            mergePeople(fromId, intoId);
            setMerging(null);
          }}
        />
      )}
    </main>
  );
}
