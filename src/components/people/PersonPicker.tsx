import { useMemo, useState } from "react";
import { count } from "../../lib/format";
import { listPeople, type Person } from "../../lib/library";
import { matchPeople, nameKey } from "../../lib/people";
import { useStore } from "../../lib/store";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import styles from "./People.module.css";

interface PersonPickerProps {
  /** People already chosen, left out of the list. */
  exclude?: string[];
  onSelect: (person: Person) => void;
  /** A name that isn't anyone yet. Leave out where only existing people make sense. */
  onCreate?: (name: string) => void;
  /** Offered when nothing is typed. */
  onSomeoneNew?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  label: string;
}

/**
 * Finding someone you've learned from before, as you type their name. New
 * names are one tap away, so nobody gets entered twice by accident.
 */
export function PersonPicker({
  exclude = [],
  onSelect,
  onCreate,
  onSomeoneNew,
  autoFocus = false,
  placeholder = "Their name",
  label,
}: PersonPickerProps) {
  const { captures, people } = useStore();
  const everyone = useMemo(() => listPeople(captures, people), [captures, people]);
  const [query, setQuery] = useState("");

  const available = everyone.filter((p) => !exclude.includes(p.id));
  const typed = query.trim().replace(/\s+/g, " ");
  const matches = typed ? matchPeople(available, typed).slice(0, 5) : available.slice(0, 4);
  const exact = typed ? available.find((p) => nameKey(p.name) === nameKey(typed)) : undefined;

  const submit = () => {
    if (!typed) return;
    if (exact) onSelect(exact);
    else if (matches.length === 1 && !onCreate) onSelect(matches[0]);
    else onCreate?.(typed);
  };

  return (
    <div className={styles.picker}>
      <input
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="next"
        maxLength={48}
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
      />

      {!typed && matches.length > 0 && <p className={styles.listLabel}>People you’ve asked</p>}
      <ul className={styles.options} aria-label={typed ? "Matching people" : "People you’ve asked"}>
        {matches.map((p) => (
          <li key={p.id}>
            <button type="button" className={styles.option} onClick={() => onSelect(p)}>
              <Avatar name={p.name} photo={p.photo} size="sm" />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{p.name}</span>
                <span className={styles.optionMeta}>
                  {count(p.conversations.length, "conversation")}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
        {typed && onCreate ? (
          <li>
            <button type="button" className={`${styles.option} ${styles.create}`} onClick={() => onCreate(typed)}>
              <span className={styles.plus} aria-hidden="true">
                <Icon name="plus" size={16} strokeWidth={2} />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionName}>
                  {exact ? "Someone else called" : "Create"} “{typed}”
                </span>
                {matches.length === 0 && <span className={styles.optionMeta}>Someone new to your Library</span>}
              </span>
            </button>
          </li>
        ) : (
          !typed &&
          onSomeoneNew && (
            <li>
              <button type="button" className={`${styles.option} ${styles.create}`} onClick={onSomeoneNew}>
                <span className={styles.plus} aria-hidden="true">
                  <Icon name="plus" size={16} strokeWidth={2} />
                </span>
                <span className={styles.optionText}>
                  <span className={styles.optionName}>Someone new</span>
                </span>
              </button>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
