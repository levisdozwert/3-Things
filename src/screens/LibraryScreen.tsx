import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Mark } from "../components/Mark";
import { count, daysAgo, relativeDay } from "../lib/format";
import { useStore } from "../lib/store";
import type { Capture } from "../lib/types";
import styles from "./LibraryScreen.module.css";

interface Result {
  capture: Capture;
  /** A thing that matched the search when the question itself didn't. */
  matchedThing?: string;
}

function normalize(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function search(captures: Capture[], query: string): Result[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return captures.map((capture) => ({ capture }));

  return captures.flatMap((capture) => {
    const head = normalize(`${capture.person} ${capture.question} ${capture.topic}`);
    const things = capture.things.map((t) => normalize(`${t.headline} ${t.detail}`));
    const all = `${head} ${things.join(" ")}`;
    if (!terms.every((term) => all.includes(term))) return [];
    const headMatches = terms.every((term) => head.includes(term));
    const thing = headMatches ? undefined : capture.things.find((_, i) => terms.some((term) => things[i].includes(term)));
    return [{ capture, matchedThing: thing?.headline }];
  });
}

function Row({ capture, matchedThing }: Result) {
  return (
    <li>
      <Link to={`/library/${capture.id}`} viewTransition className={styles.row}>
        <div className={styles.who}>
          <Avatar name={capture.person} size="sm" />
          <span className={styles.person}>
            {capture.person ? (
              <>
                <span className={styles.from}>From</span> {capture.person}
              </>
            ) : (
              <span className={styles.from}>From this conversation</span>
            )}
          </span>
          <Mark size="sm" tone="muted" filled={capture.things.length} className={styles.mark} />
        </div>
        <p
          className={`serif ${styles.question}`}
          style={{ viewTransitionName: `question-${capture.id}` } as CSSProperties}
        >
          {capture.question}
        </p>
        {matchedThing && (
          <p className={styles.match}>
            <span aria-hidden="true">↳</span> {matchedThing}
          </p>
        )}
        <p className={styles.meta}>
          {capture.topic} · {relativeDay(capture.recordedAt)}
        </p>
      </Link>
    </li>
  );
}

export function LibraryScreen() {
  const { captures } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const results = useMemo(() => search(captures, query), [captures, query]);
  const people = new Set(captures.map((c) => c.person.trim().toLowerCase()).filter(Boolean)).size;
  const things = captures.reduce((n, c) => n + c.things.length, 0);

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
          <h2 className={`serif ${styles.emptyTitle}`}>What people tell you will live here.</h2>
          <p className={styles.emptyText}>Ask someone a question, and keep the three things they share.</p>
          <Button icon="mic" onClick={() => navigate("/ask", { viewTransition: true })}>
            Ask for 3
          </Button>
        </div>
      </main>
    );
  }

  const thisWeek = results.filter((r) => daysAgo(r.capture.recordedAt) <= 6);
  const earlier = results.filter((r) => daysAgo(r.capture.recordedAt) > 6);
  const searching = query.trim().length > 0;

  return (
    <main className={styles.library}>
      <header className={styles.header}>
        <h1 className={`serif ${styles.title}`}>Your 3 Things</h1>
        <p className={styles.summary}>
          {count(things, "thing")} from {count(people, "person", "people")}
        </p>
      </header>

      <div className={styles.searchBar}>
        <label className={styles.search}>
          <Icon name="search" size={20} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, questions or things"
            aria-label="Search people, questions or things"
            enterKeyHint="search"
          />
          {searching && (
            <button type="button" className={styles.clear} onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size={16} strokeWidth={2} />
            </button>
          )}
        </label>
      </div>

      {searching && results.length === 0 ? (
        <div className={styles.noResults}>
          <p className="serif">Nothing matches “{query.trim()}”.</p>
          <p>Try a name, a place, or a word they used.</p>
        </div>
      ) : searching ? (
        <section>
          <h2 className={styles.group}>
            {results.length} {results.length === 1 ? "conversation" : "conversations"}
          </h2>
          <ul className={styles.list}>
            {results.map((r) => (
              <Row key={r.capture.id} {...r} />
            ))}
          </ul>
        </section>
      ) : (
        <>
          {thisWeek.length > 0 && (
            <section>
              <h2 className={styles.group}>This week</h2>
              <ul className={styles.list}>
                {thisWeek.map((r) => (
                  <Row key={r.capture.id} {...r} />
                ))}
              </ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <h2 className={styles.group}>Earlier</h2>
              <ul className={styles.list}>
                {earlier.map((r) => (
                  <Row key={r.capture.id} {...r} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
