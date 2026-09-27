import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { Mark } from "../components/Mark";
import { Sheet } from "../components/Sheet";
import { Toggle } from "../components/Toggle";
import { useMicrophoneAccess } from "../lib/audio/useMicrophoneAccess";
import { detectMode, type DistillMode } from "../lib/distill/client";
import { count } from "../lib/format";
import { listPeople, listTopics } from "../lib/library";
import { useStore } from "../lib/store";
import styles from "./YouScreen.module.css";

function Row({ title, detail, control }: { title: string; detail?: ReactNode; control: ReactNode }) {
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

function RowButton({
  title,
  detail,
  icon = "forward",
  danger = false,
  onClick,
}: {
  title: string;
  detail?: string;
  icon?: IconName | null;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${styles.rowButton} ${danger ? styles.danger : ""}`} onClick={onClick}>
      <span>
        <span className={styles.rowTitle}>{title}</span>
        {detail && <span className={styles.rowDetail}>{detail}</span>}
      </span>
      {icon && <Icon name={icon} size={icon === "forward" ? 18 : 20} />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

const PRINCIPLES = [
  ["Human first", "People create the knowledge. 3 Things only helps you keep it."],
  ["Source matters", "Every thing stays attached to the person who said it."],
  ["Conversation, not transcription", "We keep what they meant, not every word they said."],
];

type Open = "appearance" | "help" | "privacy" | "terms" | "audio" | "account" | null;

/**
 * You: who you are in the app, and how 3 Things treats what you capture.
 * Not a profile anyone else sees. No followers, no streaks, no badges.
 */
export function YouScreen() {
  const { captures, people, settings, updateSettings, deleteAllAudio, deleteEverything } = useStore();
  const navigate = useNavigate();
  const microphone = useMicrophoneAccess();
  const [mode, setMode] = useState<DistillMode | null>(null);
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => {
    void detectMode().then(setMode);
  }, []);

  const { profile } = settings;
  const shown = profile.preferredName.trim() || profile.firstName.trim();
  const fullName = [profile.firstName, profile.lastName].map((n) => n.trim()).filter(Boolean).join(" ");
  const things = captures.reduce((n, c) => n + c.things.length, 0);
  const learnedFrom = useMemo(() => listPeople(captures, people).length, [captures, people]);
  const topics = useMemo(() => listTopics(captures).length, [captures]);
  const recordings = captures.filter((c) => c.hasAudio).length;

  const exportAll = () => {
    const data = { exportedAt: new Date().toISOString(), profile, people, captures };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-3-things.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const microphoneRow = {
    allowed: { detail: "Allowed. 3 Things only listens after you tap Start listening.", control: <span className={styles.value}>On</span> },
    ask: {
      detail: "Your browser will ask the first time you record. 3 Things only listens after you tap Start listening.",
      control: (
        <Button variant="quiet" size="sm" onClick={() => void microphone.request()}>
          Allow
        </Button>
      ),
    },
    blocked: {
      detail: "Blocked in this browser. Turn it on in your browser’s site settings to record conversations.",
      control: <span className={styles.value}>Off</span>,
    },
    unavailable: {
      detail: "This browser can’t use a microphone. You can still type questions and write things down.",
      control: <span className={styles.value}>—</span>,
    },
  }[microphone.access];

  return (
    <main className={styles.you}>
      <header className={styles.profile}>
        <Avatar name={shown} photo={profile.photo} size="xl" />
        <h1 className={`serif ${styles.title}`}>{shown || "You"}</h1>
        {fullName && fullName !== shown && <p className={styles.fullName}>{fullName}</p>}
        <p className={styles.line}>Your conversations. Your people. Your things worth remembering.</p>
        {things > 0 && learnedFrom > 0 && (
          <p className={`serif ${styles.summary}`}>
            <strong>{count(things, "thing")}</strong> from <strong>{count(learnedFrom, "person", "people")}</strong>
          </p>
        )}
        <Button
          variant="quiet"
          size="sm"
          icon="pencil"
          className={styles.editProfile}
          onClick={() => navigate("/you/profile", { viewTransition: true })}
        >
          {shown ? "Edit profile" : "Add your name"}
        </Button>
      </header>

      <Section title="Recording & privacy">
        <Row title="Microphone" detail={microphoneRow.detail} control={microphoneRow.control} />
        <Row
          title="Recording reminder"
          detail="Before listening, a gentle note that everyone should be comfortable being recorded."
          control={
            <Toggle
              label="Recording reminder"
              checked={settings.consentReminder}
              onChange={(v) => updateSettings({ consentReminder: v })}
            />
          }
        />
        <Row
          title="Keep original audio"
          detail={
            settings.keepRecordings
              ? "Keep the recording so you can listen back later. It stays on this device."
              : "Recordings are deleted once the three things are saved."
          }
          control={
            <Toggle
              label="Keep original audio"
              checked={settings.keepRecordings}
              onChange={(v) => updateSettings({ keepRecordings: v })}
            />
          }
        />
        {recordings > 0 && (
          <RowButton
            title="Delete all recordings"
            detail={`${count(recordings, "recording")} on this device. Your three things stay.`}
            icon={null}
            onClick={() => setOpen("audio")}
          />
        )}
        <p className={styles.note}>
          The people in your Library are private. Their names, photos and what they told you are never public, and
          nobody else can search for them.
        </p>
      </Section>

      <Section title="Your Library">
        <RowButton
          title="Topics"
          detail={topics > 0 ? `${count(topics, "topic")}, from what you’ve asked` : "They appear as you save conversations"}
          onClick={() => navigate("/library?view=topics", { viewTransition: true })}
        />
        <RowButton
          title="Export your 3 Things"
          detail="What you’ve captured belongs to you. Download all of it as a file, any time."
          icon="download"
          onClick={exportAll}
        />
        <Row
          title="Sample conversations"
          detail="Show the examples that come with 3 Things."
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
      </Section>

      <Section title="App">
        <RowButton
          title="Appearance"
          detail={[settings.largerText ? "Larger text" : "Standard text", settings.calmMotion ? "calmer motion" : "full motion"].join(" · ")}
          onClick={() => setOpen("appearance")}
        />
        <Row
          title="When someone answers"
          detail="A quiet note when someone sends their 3 back. That’s the only thing 3 Things ever tells you: no reminders, no streaks."
          control={
            <Toggle
              label="When someone answers"
              checked={settings.notifyAnswers}
              onChange={(v) => {
                updateSettings({ notifyAnswers: v });
                // Device notifications only if the user turns this on themselves.
                if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
                  void Notification.requestPermission();
                }
              }}
            />
          }
        />
        <RowButton title="Help" detail="How 3 Things listens" onClick={() => setOpen("help")} />
        <RowButton title="Privacy" onClick={() => setOpen("privacy")} />
        <RowButton title="Terms" onClick={() => setOpen("terms")} />
      </Section>

      <Section title="Account">
        <RowButton
          title="Delete your account"
          detail="Your profile, and every conversation, person and recording on this device."
          icon={null}
          danger
          onClick={() => setOpen("account")}
        />
      </Section>

      <footer className={styles.footer}>
        <Mark size="sm" />
        <span>
          3 Things 0.1
          {mode && ` · ${mode === "live" ? "Listening service connected" : "Preview mode"}`}
        </span>
      </footer>

      <Sheet
        open={open === "appearance"}
        title="Appearance"
        onClose={() => setOpen(null)}
        actions={
          <Button variant="ink" block onClick={() => setOpen(null)}>
            Done
          </Button>
        }
      >
        <Row
          title="Larger text"
          detail="Everything a little bigger and easier to read."
          control={
            <Toggle label="Larger text" checked={settings.largerText} onChange={(v) => updateSettings({ largerText: v })} />
          }
        />
        <Row
          title="Calmer motion"
          detail="Fewer animations between screens. Your device’s reduced-motion setting is always respected."
          control={
            <Toggle label="Calmer motion" checked={settings.calmMotion} onChange={(v) => updateSettings({ calmMotion: v })} />
          }
        />
      </Sheet>

      <Sheet
        open={open === "help"}
        title="How 3 Things listens"
        onClose={() => setOpen(null)}
        actions={
          <Button variant="ink" block onClick={() => setOpen(null)}>
            Done
          </Button>
        }
      >
        <p className={`serif ${styles.motto}`}>Their knowledge. Clearly captured.</p>
        <p className={styles.aboutText}>
          When someone answers, 3 Things listens back and writes down the three things they said, clearly and in as
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
      </Sheet>

      <Sheet
        open={open === "privacy"}
        title="Privacy"
        onClose={() => setOpen(null)}
        actions={
          <Button variant="ink" block onClick={() => setOpen(null)}>
            Done
          </Button>
        }
      >
        <ul className={styles.plain}>
          <li>
            <strong>Your Library lives on this device.</strong> Conversations, people and recordings are stored here. To
            find the three things, the words of a conversation are sent to the listening service; the result comes back
            here.
          </li>
          <li>
            <strong>People are private.</strong> Jason in your Library is your own reference to Jason, not an account.
            Their name, photo and answers are never public, and nobody else can search for them. If Jason ever joins 3
            Things, their own account stays separate unless you both choose to connect.
          </li>
          <li>
            <strong>No faces, no contacts.</strong> 3 Things never takes photos on its own, never recognizes faces, and
            never reads your address book. Who someone is always comes from you.
          </li>
          <li>
            <strong>Recordings are yours.</strong> Keep them to listen back, or delete them. The three things stay
            either way.
          </li>
        </ul>
      </Sheet>

      <Sheet
        open={open === "terms"}
        title="Terms"
        onClose={() => setOpen(null)}
        actions={
          <Button variant="ink" block onClick={() => setOpen(null)}>
            Done
          </Button>
        }
      >
        The full terms will be here before 3 Things launches. The short version: what you capture belongs to you, and
        you can export it or delete it at any time.
      </Sheet>

      <Sheet
        open={open === "audio"}
        title="Delete all recordings?"
        onClose={() => setOpen(null)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deleteAllAudio();
                setOpen(null);
              }}
            >
              Delete {count(recordings, "recording")}
            </Button>
            <Button variant="text" size="md" block onClick={() => setOpen(null)}>
              Cancel
            </Button>
          </>
        }
      >
        The audio is removed from this device. The three things from each conversation stay; you just won’t be able to
        listen back.
      </Sheet>

      <Sheet
        open={open === "account"}
        title="Delete your account?"
        onClose={() => setOpen(null)}
        actions={
          <>
            <Button
              variant="ink"
              block
              onClick={() => {
                deleteEverything();
                setOpen(null);
              }}
            >
              Delete account
            </Button>
            <Button variant="text" size="md" block onClick={() => setOpen(null)}>
              Cancel
            </Button>
          </>
        }
      >
        This removes your profile and everything in your Library from this device: every conversation, every person and
        every recording. It can’t be undone. If you want a copy, export your 3 Things first.
      </Sheet>
    </main>
  );
}
