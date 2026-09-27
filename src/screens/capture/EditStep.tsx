import { useState } from "react";
import { Button } from "../../components/Button";
import { ThingsEditor, type Draft } from "../../components/ThingsEditor";
import flow from "./Flow.module.css";
import styles from "./EditStep.module.css";

interface EditStepProps {
  question: string;
  draft: Draft;
  /** Open with this thing ready to edit (e.g. from "Edit" on an unclear thing). */
  focusIndex?: number | null;
  saveLabel?: string;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
  /** Someone editing their own answer: their words, not who or where. */
  own?: boolean;
}

export function EditStep({ question, draft, focusIndex = null, saveLabel = "Save", onSave, onCancel, own = false }: EditStepProps) {
  const [value, setValue] = useState<Draft>(draft);
  const usable = value.things.filter((t) => t.headline.trim());

  return (
    <>
      <div className={`${flow.topbar} ${styles.topbar}`}>
        <Button variant="text" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <span className={flow.topbarTitle}>Edit</span>
        <span />
      </div>

      <div className={`${flow.content} ${styles.content}`}>
        <header className={styles.header}>
          <h1 className={`${flow.question} ${flow.questionLG}`}>{question}</h1>
          <p className={styles.hint}>{own ? "Make it sound like you. Only what you send is shared." : "Keep it true to what they said."}</p>
        </header>
        <ThingsEditor value={value} onChange={setValue} focusIndex={focusIndex} meta={!own} />
      </div>

      <div className={flow.footer}>
        <Button
          block
          icon="check"
          disabled={usable.length === 0}
          onClick={() => onSave({ ...value, things: usable })}
        >
          {saveLabel}
        </Button>
      </div>
    </>
  );
}
