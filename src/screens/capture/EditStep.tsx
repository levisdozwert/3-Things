import { useState } from "react";
import { Button } from "../../components/Button";
import { ThingsEditor, type Draft } from "../../components/ThingsEditor";
import flow from "./Flow.module.css";
import styles from "./EditStep.module.css";

interface EditStepProps {
  question: string;
  draft: Draft;
  saveLabel?: string;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}

export function EditStep({ question, draft, saveLabel = "Save", onSave, onCancel }: EditStepProps) {
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
          <p className={styles.hint}>Keep it true to what they said.</p>
        </header>
        <ThingsEditor value={value} onChange={setValue} />
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
