import { useEffect, useState } from "react";
import { isNew, speakerLabel, type Speaker } from "../../lib/people";
import { useStore } from "../../lib/store";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Sheet } from "../Sheet";
import { PersonPicker } from "./PersonPicker";
import styles from "./People.module.css";

interface WhoSheetProps {
  open: boolean;
  speakers: Speaker[];
  onDone: (speakers: Speaker[], label: string) => void;
  onClose: () => void;
}

/**
 * Who a conversation is from, after the fact: add a name to "this
 * conversation", correct it, or say several people answered. Identity always
 * comes from the user; nothing is guessed from voices or faces.
 */
export function WhoSheet({ open, speakers, onDone, onClose }: WhoSheetProps) {
  const { people } = useStore();
  const [several, setSeveral] = useState(speakers.length > 1);
  const [chosen, setChosen] = useState<Speaker[]>(speakers);

  useEffect(() => {
    if (!open) return;
    setSeveral(speakers.length > 1);
    setChosen(speakers);
    // Start fresh each time it opens.
  }, [open]);

  const finish = (next: Speaker[]) => onDone(next, speakerLabel(next, people));
  const nameOf = (s: Speaker) => (isNew(s) ? s.name : (people.find((p) => p.id === s.id)?.name ?? ""));
  const keyOf = (s: Speaker) => (isNew(s) ? `new:${s.name}` : s.id);

  return (
    <Sheet
      open={open}
      title={several ? "Who was in this conversation?" : "Who was this?"}
      onClose={onClose}
      actions={
        several ? (
          <>
            <Button variant="ink" block disabled={chosen.length === 0} onClick={() => finish(chosen)}>
              Done
            </Button>
            <Button variant="text" size="md" block onClick={onClose}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="text" size="md" block onClick={onClose}>
            Cancel
          </Button>
        )
      }
    >
      {several && chosen.length > 0 && (
        <div className={styles.chosen}>
          {chosen.map((s) => (
            <span key={keyOf(s)} className={styles.chip}>
              <Avatar name={nameOf(s)} size="xs" />
              {nameOf(s)}
              <button
                type="button"
                aria-label={`Remove ${nameOf(s)}`}
                onClick={() => setChosen(chosen.filter((c) => keyOf(c) !== keyOf(s)))}
              >
                <Icon name="close" size={14} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      <PersonPicker
        key={several ? `several-${chosen.length}` : "one"}
        autoFocus
        label={several ? "Add someone who answered" : "Who was this?"}
        placeholder={several ? "Add someone" : "Their name"}
        exclude={several ? chosen.flatMap((s) => (isNew(s) ? [] : [s.id])) : []}
        onSelect={(p) => (several ? setChosen([...chosen, { id: p.id }]) : finish([{ id: p.id }]))}
        onCreate={(name) => (several ? setChosen([...chosen, { name }]) : finish([{ name }]))}
      />

      {several ? (
        <p className={styles.sheetNote}>
          Their things stay with the conversation, from all of them. 3 Things won’t guess who said what.
        </p>
      ) : (
        <div className={styles.sheetLinks}>
          <button type="button" className={styles.link} onClick={() => setSeveral(true)}>
            Several people answered
          </button>
          {speakers.length > 0 && (
            <button type="button" className={styles.link} onClick={() => finish([])}>
              Remove the name
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
