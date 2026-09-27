import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Mark } from "../components/Mark";
import { Sheet } from "../components/Sheet";
import { Toggle } from "../components/Toggle";
import { detectMode, type DistillMode } from "../lib/distill/client";
import { count } from "../lib/format";
import { useStore } from "../lib/store";
import styles from "./YouScreen.module.css";

function Row({ title, detail, control }: { title: string; detail?: string; control: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{title}</p>
        {detail && <p className={styles.rowDetail}>{detail}</p>}
      </div>
      {control}
    </div>
  );
}

const PRINCIPLES = [
  ["Human first", "People create the knowledge. 3 Things only helps you keep it."],
  ["Source matters", "Every thing stays attached to the person who said it."],
  ["Conversation, not transcription", "We keep what they meant, not every word they said."],
];

export function YouScreen() {
  const { captures, settings, updateSettings, deleteEverything } = useStore();
  const [mode, setMode] = useState<DistillMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void detectMode().then(setMode);
  }, []);

  const things = captures.reduce((n, c) => n + c.things.length, 0);
  const people = new Set(captures.map((c) => c.person.trim().toLowerCase()).filter(Boolean)).size;

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), captures }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-3-things.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className={styles.you}>
      <h1 className={`serif ${styles.title}`}>You</h1>

      <section className={styles.profile}>
        <Avatar name={settings.name} size="lg" />
        <div className={styles.profileText}>
          <input
            className={styles.name}
            value={settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
            placeholder="Your name"
            aria-label="Your name"
            autoComplete="given-name"
          />
          <p className={styles.kept}>
            {things > 0
              ? `You’ve kept ${count(things, "thing")} from ${count(people, "person", "people")}.`
              : "Nothing kept yet. Ask someone something."}
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listening</h2>
        <Row
          title="Consent reminder"
          detail="A gentle note before listening that everyone should be comfortable being recorded."
          control={
            <Toggle
              label="Consent reminder"
              checked={settings.consentReminder}
              onChange={(v) => updateSettings({ consentReminder: v })}
            />
          }
        />
        <Row
          title="Keep recordings"
          detail="Save the audio with each 3 Things so you can listen back. Stored only on this device."
          control={
            <Toggle
              label="Keep recordings"
              checked={settings.keepRecordings}
              onChange={(v) => updateSettings({ keepRecordings: v })}
            />
          }
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your library</h2>
        <Row
          title="Sample conversations"
          detail="Show the examples that come with 3 Things."
          control={
            <Toggle
              label="Sample conversations"
              checked={settings.showSamples}
              onChange={(v) => updateSettings({ showSamples: v })}
            />
          }
        />
        {settings.showSamples && (
          <Row
            title="A year of conversations"
            detail="Add a year of sample conversations to see how the Library feels with hundreds of things in it. Remove them any time."
            control={
              <Toggle
                label="A year of conversations"
                checked={settings.fullLibrary}
                onChange={(v) => updateSettings({ fullLibrary: v })}
              />
            }
          />
        )}
        <button type="button" className={styles.rowButton} onClick={exportAll}>
          <span>
            <span className={styles.rowTitle}>Export your 3 Things</span>
            <span className={styles.rowDetail}>Download everything you’ve kept as a file.</span>
          </span>
          <Icon name="download" size={20} />
        </button>
        <button type="button" className={`${styles.rowButton} ${styles.danger}`} onClick={() => setConfirmDelete(true)}>
          <span className={styles.rowTitle}>Delete everything</span>
        </button>
      </section>

      <section className={`${styles.section} ${styles.about}`}>
        <h2 className={styles.sectionTitle}>How 3 Things listens</h2>
        <p className={`serif ${styles.motto}`}>Their knowledge. Clearly captured.</p>
        <p className={styles.aboutText}>
          When someone answers, 3 Things listens back and writes down the three things they said, clearly and in as
          few words as possible. It never adds its own ideas, looks things up, or changes what someone meant. If they
          shared two things, you’ll see two.
        </p>
        <ol className={styles.principles}>
          {PRINCIPLES.map(([title, text], i) => (
            <li key={title}>
              <span className={`serif ${styles.principleNumber}`}>{i + 1}</span>
              <div>
                <p className={styles.principleTitle}>{title}</p>
                <p className={styles.principleText}>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        <Mark size="sm" />
        <span>
          3 Things 0.1
          {mode && ` · ${mode === "live" ? "Listening service connected" : "Preview mode"}`}
        </span>
      </footer>

      <Sheet
        open={confirmDelete}
        title="Delete everything?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deleteEverything();
                setConfirmDelete(false);
              }}
            >
              Delete everything
            </Button>
            <Button variant="text" size="md" block onClick={() => setConfirmDelete(false)}>
              Keep my 3 Things
            </Button>
          </>
        }
      >
        Every saved conversation and recording on this device will be removed. This can’t be undone.
      </Sheet>
    </main>
  );
}
