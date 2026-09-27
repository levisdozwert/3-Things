import { useEffect, useState } from "react";
import { count } from "../../lib/format";
import type { Person } from "../../lib/library";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Sheet } from "../Sheet";
import { PersonPicker } from "./PersonPicker";
import styles from "./People.module.css";

interface MergeSheetProps {
  open: boolean;
  /** The person you're starting from. */
  first: Person;
  /** When the Library suggested the pair; otherwise you pick. */
  second?: Person;
  onMerge: (fromId: string, intoId: string) => void;
  /** Only when the Library suggested it: remember that they're different people. */
  onKeepSeparate?: () => void;
  onClose: () => void;
}

/**
 * "Are these the same person?" Two names, pick the one to keep, and their
 * conversations come together. Nothing is deleted.
 */
export function MergeSheet({ open, first, second, onMerge, onKeepSeparate, onClose }: MergeSheetProps) {
  const [other, setOther] = useState<Person | undefined>(second);
  const [keep, setKeep] = useState<string>(first.id);

  useEffect(() => {
    if (!open) return;
    setOther(second);
    // Keep the name you've used most, unless you choose otherwise.
    setKeep(second && second.conversations.length > first.conversations.length ? second.id : first.id);
  }, [open, first, second]);

  if (!other) {
    return (
      <Sheet
        open={open}
        title={`Same person as ${first.name}?`}
        onClose={onClose}
        actions={
          <Button variant="text" size="md" block onClick={onClose}>
            Cancel
          </Button>
        }
      >
        <p className={styles.sheetNote}>Choose who {first.name} is the same person as.</p>
        <PersonPicker
          autoFocus
          label="Who is the same person?"
          placeholder="Their other name"
          exclude={[first.id]}
          onSelect={(p) => {
            setOther(p);
            setKeep(p.conversations.length > first.conversations.length ? p.id : first.id);
          }}
        />
      </Sheet>
    );
  }

  const pair = [first, other];
  return (
    <Sheet
      open={open}
      title="Are these the same person?"
      onClose={onClose}
      actions={
        <>
          <Button
            variant="ink"
            block
            onClick={() => {
              const into = keep;
              onMerge(into === first.id ? other.id : first.id, into);
            }}
          >
            Merge
          </Button>
          <Button variant="text" size="md" block onClick={onKeepSeparate ?? onClose}>
            {onKeepSeparate ? "Keep separate" : "Cancel"}
          </Button>
        </>
      }
    >
      <div className={styles.pair} role="radiogroup" aria-label="Which name to keep">
        {pair.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={keep === p.id}
            className={styles.pairPerson}
            onClick={() => setKeep(p.id)}
          >
            <Avatar name={p.name} photo={p.photo} size="md" />
            <span className={styles.pairName}>{p.name}</span>
            <span className={styles.pairMeta}>
              {count(p.conversations.length, "conversation")}
              {p.note ? ` · ${p.note}` : ""}
            </span>
          </button>
        ))}
      </div>
      <p className={styles.sheetNote}>
        Their conversations come together as{" "}
        <strong>{pair.find((p) => p.id === keep)?.name}</strong>. Nothing is deleted, and each conversation keeps its
        date.
      </p>
    </Sheet>
  );
}
