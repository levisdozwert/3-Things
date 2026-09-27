import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import type { Draft } from "../../components/ThingsEditor";
import { saveRecording } from "../../lib/audio/audioStore";
import { useRecorder } from "../../lib/audio/useRecorder";
import { useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { detectMode, findThreeThings, followUpThings, NothingHeardError } from "../../lib/distill/client";
import type { DistilledThing } from "../../lib/distill/contract";
import { newId, tidyQuestion } from "../../lib/format";
import { listPeople } from "../../lib/library";
import { isNew, nameKey, speakerLabel, type Speaker } from "../../lib/people";
import { useStore } from "../../lib/store";
import { withTransition, type Direction } from "../../lib/transition";
import type { Capture, Recording, Thing } from "../../lib/types";
import { AskStep } from "./AskStep";
import { EditStep } from "./EditStep";
import flow from "./Flow.module.css";
import { ListeningStep, type ListeningProblem } from "./ListeningStep";
import { ProblemStep, type Problem } from "./ProblemStep";
import { ProcessingStep } from "./ProcessingStep";
import { ReadyStep } from "./ReadyStep";
import { ReviewStep } from "./ReviewStep";
import { SavedStep } from "./SavedStep";
import { WhoStep } from "./WhoStep";

type Step = "ask" | "who" | "ready" | "listening" | "processing" | "review" | "edit" | "saved" | "problem";

/** Going back to the speaker from the review screen. */
type Asking = { kind: "more"; want: number; asked: string } | { kind: "clarify"; index: number; asked: string };

const asDistilled = ({ headline, detail, quote, said, unclear }: Thing): DistilledThing => ({
  headline,
  detail,
  quote: quote ?? "",
  ...(said ? { said } : {}),
  ...(unclear ? { unclear } : {}),
});

/** Long enough for "Got it." and "Finding the three things" to read as care, not delay. */
const MIN_PROCESSING_MS = 4800;
const MIN_FOLLOW_UP_MS = 3400;
/** A safety net for a phone left recording, not a limit on conversation. */
const MAX_RECORDING_SEC = 30 * 60;

/**
 * Ask → Who → Ready → Listen → Understand → Verify → Save.
 * One screen at a time, with the question carried through every step.
 */
export function CaptureFlow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings, saveCapture, captures, people, getPerson } = useStore();

  const recorder = useRecorder();
  const answer = useSpeechRecognition({ continuous: true });

  const initialQuestion = tidyQuestion(params.get("q") ?? "");
  const [step, setStep] = useState<Step>(initialQuestion ? "who" : "ask");
  const [askMode, setAskMode] = useState<"voice" | "type">(params.get("type") ? "type" : "voice");
  const [question, setQuestion] = useState(initialQuestion);
  // "Ask Jason something": start with Jason already chosen.
  const [speakers, setSpeakers] = useState<Speaker[]>(() => {
    const asked = params.get("person")?.trim();
    if (!asked) return [];
    if (getPerson(asked)) return [{ id: asked }];
    const named = people.find((p) => nameKey(p.name) === nameKey(asked));
    return [named ? { id: named.id } : { name: asked }];
  });
  const person = speakerLabel(speakers, people);
  const [preselected] = useState(() => (speakers[0] && !isNew(speakers[0]) ? speakers[0].id : null));
  const [introduced, setIntroduced] = useState(false);

  const [starting, setStarting] = useState(false);
  const [listenProblem, setListenProblem] = useState<ListeningProblem | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [simElapsed, setSimElapsed] = useState(0);
  const [simPaused, setSimPaused] = useState(false);
  const [canPreview, setCanPreview] = useState(false);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

  /** The conversation, then any follow-ups, in order. */
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [extra, setExtra] = useState<Thing | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [editFocus, setEditFocus] = useState<number | null>(null);
  const [edited, setEdited] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sample, setSample] = useState<string | undefined>();
  const [manual, setManual] = useState(false);
  const [problem, setProblem] = useState<Problem>("failed");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Capture | null>(null);
  const [confirm, setConfirm] = useState<"recording" | "result" | null>(null);

  // Bumped whenever in-flight work should be ignored (cancel, retry, start over).
  const generation = useRef(0);
  // One stop per recording, however many times Stop is tapped.
  const stopping = useRef(false);

  const go = useCallback(
    (next: Step, direction: Direction = "forward") => withTransition(() => setStep(next), direction),
    [],
  );
  const leave = useCallback(() => navigate("/", { viewTransition: true }), [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    void detectMode().then((mode) => setCanPreview(mode === "preview"));
  }, []);

  // ── Listening ──────────────────────────────────────────────

  const beginRecording = async () => {
    stopping.current = false;
    setStarting(true);
    setListenProblem(null);
    setSimulated(false);
    const status = await recorder.start();
    setStarting(false);
    if (status === "recording") {
      answer.start();
    } else {
      setListenProblem(status === "denied" ? "denied" : status === "failed" ? "failed" : "unavailable");
    }
  };

  const previewWithoutMic = () => {
    stopping.current = false;
    setListenProblem(null);
    setSimulated(true);
    setSimPaused(false);
    setSimElapsed(0);
  };

  const startListening = () => {
    // A conversation previewed without a microphone keeps going that way for its follow-ups.
    if (recordings[0]?.simulated) previewWithoutMic();
    // Called straight from the tap so the browser treats the microphone request as user-initiated.
    else void beginRecording();
    go("listening");
  };

  useEffect(() => {
    if (step !== "listening" || !simulated || simPaused) return;
    const timer = window.setInterval(() => setSimElapsed((s) => s + 0.25), 250);
    return () => window.clearInterval(timer);
  }, [step, simulated, simPaused]);

  // The microphone went away mid-conversation.
  const { abort: abortAnswer } = answer;
  useEffect(() => {
    if (step !== "listening" || recorder.status !== "failed") return;
    abortAnswer();
    setListenProblem("failed");
  }, [step, recorder.status, abortAnswer]);

  const paused = simulated ? simPaused : recorder.status === "paused";

  const pauseListening = () => {
    if (simulated) return setSimPaused(true);
    recorder.pause();
    answer.pause();
  };

  const resumeListening = () => {
    if (simulated) return setSimPaused(false);
    recorder.resume();
    answer.resume();
  };

  const settleAfter = (started: number, minimum: number) =>
    new Promise((r) => setTimeout(r, Math.max(0, minimum - (performance.now() - started))));

  // ── Understanding ─────────────────────────────────────────

  const findThings = useCallback(
    async (rec: Recording, heardFrom: string) => {
      const run = ++generation.current;
      const started = performance.now();
      try {
        const result = await findThreeThings(
          { question, transcript: rec.transcript, person: heardFrom },
          { preview: rec.simulated },
        );
        await settleAfter(started, MIN_PROCESSING_MS);
        if (run !== generation.current) return;
        setPreview(result.mode === "preview");
        setSample(result.sample);
        setManual(false);
        setEdited(false);
        setNote(null);
        setFresh([]);
        setDraft({
          person: heardFrom,
          speakers,
          topic: result.response.topic,
          place: result.response.place,
          things: result.response.things.map((t) => ({ id: newId(), ...t })),
        });
        setExtra(result.response.extra ? { id: newId(), ...result.response.extra } : null);
        go("review");
      } catch (error) {
        await settleAfter(started, MIN_PROCESSING_MS);
        if (run !== generation.current) return;
        setProblem(error instanceof NothingHeardError ? "nothing-heard" : "failed");
        go("problem");
      }
    },
    [question, go, speakers],
  );

  /** What the speaker said when the asker went back to them: more things, or a clearer one. */
  const understandFollowUp = async (rec: Recording, ask: Asking, current: Draft, earlier: Recording[]) => {
    const run = ++generation.current;
    const started = performance.now();
    const conversation = earlier.map((r) => r.transcript).join(" ");
    try {
      const things = await followUpThings(
        {
          question,
          transcript: conversation,
          person: current.person,
          followUp:
            ask.kind === "more"
              ? { kind: "more", asked: ask.asked, transcript: rec.transcript, keep: current.things.map(asDistilled), want: ask.want }
              : { kind: "clarify", asked: ask.asked, transcript: rec.transcript, thing: asDistilled(current.things[ask.index]) },
        },
        { preview: preview || rec.simulated, sample },
      );
      await settleAfter(started, MIN_FOLLOW_UP_MS);
      if (run !== generation.current) return;

      if (ask.kind === "more") {
        if (things.length === 0) {
          setNote("Nothing new came up in that follow-up");
          setFresh([]);
        } else {
          const added = things.map((t) => ({ id: newId(), ...t }));
          setDraft({ ...current, things: [...current.things, ...added] });
          setFresh(added.map((t) => t.id));
          setNote(null);
        }
      } else {
        const clarified = things[0];
        const id = current.things[ask.index].id;
        if (!clarified) {
          setNote("That follow-up didn’t clear it up. You can edit it or keep it as-is");
          setFresh([]);
        } else {
          setDraft({ ...current, things: current.things.map((t, i) => (i === ask.index ? { ...clarified, id } : t)) });
          setFresh([id]);
          setNote(clarified.unclear ? "It’s still not completely clear" : null);
        }
      }
    } catch {
      await settleAfter(started, MIN_FOLLOW_UP_MS);
      if (run !== generation.current) return;
      setNote("Something interrupted that follow-up. Nothing changed");
    }
    setAsking(null);
    go("review", "none");
  };

  const stopListening = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    // A small tap you can feel, where the phone supports it.
    navigator.vibrate?.(12);
    setStoppedAt(simulated ? simElapsed : recorder.elapsed);
    go("processing", "none");
    let rec: Recording;
    if (simulated) {
      rec = { audio: null, durationSec: simElapsed, transcript: "", simulated: true };
    } else {
      const [stopped, transcript] = await Promise.all([recorder.stop(), answer.stop()]);
      rec = { audio: stopped.blob, durationSec: stopped.durationSec, transcript, simulated: false };
    }
    if (asking && draft) {
      setRecordings([...recordings, rec]);
      void understandFollowUp(rec, asking, draft, recordings);
    } else {
      setRecordings([rec]);
      void findThings(rec, person);
    }
  }, [go, simulated, simElapsed, recorder, answer, findThings, person, asking, draft, recordings, understandFollowUp]);

  useEffect(() => {
    if (step === "listening" && recorder.elapsed >= MAX_RECORDING_SEC) void stopListening();
  }, [step, recorder.elapsed, stopListening]);

  const discardRecording = () => {
    generation.current++;
    recorder.discard();
    answer.abort();
    setConfirm(null);
    // Leaving a follow-up keeps the three things already found.
    if (asking && draft) {
      setAsking(null);
      go("review", "back");
      return;
    }
    leave();
  };

  // ── Going back to the speaker ───────────────────────────────

  const askForMore = () => {
    if (!draft) return;
    const want = 3 - draft.things.length;
    setAsking({ kind: "more", want, asked: want === 1 ? "Is there one more thing you’d add?" : "Are there two more things you’d add?" });
    setNote(null);
    startListening();
  };

  const clarify = (index: number) => {
    const thing = draft?.things[index];
    if (!thing?.unclear) return;
    setAsking({ kind: "clarify", index, asked: thing.unclear });
    setNote(null);
    startListening();
  };

  const keepAsIs = (index: number) => {
    if (!draft) return;
    setDraft({ ...draft, things: draft.things.map((t, i) => (i === index ? { ...t, unclear: undefined } : t)) });
  };

  const swapExtra = (index: number) => {
    if (!draft || !extra) return;
    const replaced = draft.things[index];
    const incoming = { ...extra, id: newId() };
    setDraft({ ...draft, things: draft.things.map((t, i) => (i === index ? incoming : t)) });
    setExtra(replaced);
    setFresh([incoming.id]);
  };

  // ── Saving ─────────────────────────────────────────────────

  const save = async (value: Draft) => {
    setSaving(true);
    const id = newId();
    const things = value.things
      .filter((t) => t.headline.trim())
      // Saving is the asker's "looks right": anything left unclear was accepted as-is.
      .map((t) => ({ ...t, headline: t.headline.trim(), detail: t.detail.trim(), unclear: undefined }));
    const audio = recordings.flatMap((r) => (r.audio ? [r.audio] : []));
    const hasAudio = settings.keepRecordings && audio.length > 0 ? await saveRecording(id, audio) : false;
    const capture: Capture = {
      id,
      question,
      person: value.person.trim(),
      personIds: [],
      topic: value.topic || "Life",
      ...(value.place?.trim() ? { place: value.place.trim() } : {}),
      things,
      recordedAt: new Date().toISOString(),
      durationSec: Math.round(recordings.reduce((sum, r) => sum + r.durationSec, 0)),
      hasAudio,
      origin: manual ? "manual" : "recording",
      ...(edited && !manual ? { edited: true } : {}),
      ...(preview && !manual ? { preview: true } : {}),
    };
    setIntroduced(value.speakers.length === 1 && isNew(value.speakers[0]));
    setSaved(saveCapture(capture, value.speakers));
    setSaving(false);
    go("saved");
  };

  const finishEditing = (value: Draft) => {
    const before = new Map(draft?.things.map((t) => [t.id, t]));
    // Something the asker rewrote is no longer "unclear": they've decided what it says.
    const things = value.things.map((t) => {
      const was = before.get(t.id);
      const changed = !was || was.headline !== t.headline || was.detail !== t.detail;
      return changed ? { ...t, unclear: undefined } : t;
    });
    const next = { ...value, things };
    if (manual) {
      setDraft(next);
      void save(next);
      return;
    }
    setDraft(next);
    setEdited(true);
    setFresh([]);
    setNote(null);
    go("review", "back");
  };

  const writeYourself = () => {
    setManual(true);
    setPreview(false);
    setExtra(null);
    setEditFocus(0);
    setDraft({ person, speakers, topic: "", things: [{ id: newId(), headline: "", detail: "" }] });
    go("edit");
  };

  // Before a new question with someone you know: what you've asked them before.
  const known = preselected ? listPeople(captures, people).find((p) => p.id === preselected) : undefined;
  const askingContext = known ? { name: known.name, photo: known.photo, topics: known.topics.slice(0, 3) } : undefined;

  // ── Render ─────────────────────────────────────────────────

  const followUpLabel = asking?.kind === "more" ? `Asking for ${asking.want === 1 ? "one more" : "two more"}` : "A quick follow-up";

  return (
    <main className={flow.flow} data-step={step}>
      {step === "ask" && (
        <AskStep
          initialMode={askMode}
          initialText={question}
          asking={askingContext}
          onContinue={(q) => {
            setQuestion(tidyQuestion(q));
            go("who");
          }}
          onClose={leave}
        />
      )}

      {step === "who" && (
        <WhoStep
          question={question}
          speakers={speakers}
          onChange={setSpeakers}
          onContinue={() => go("ready")}
          onSkip={() => {
            setSpeakers([]);
            go("ready");
          }}
          onBack={() => {
            setAskMode("type");
            go("ask", "back");
          }}
        />
      )}

      {step === "ready" && (
        <ReadyStep
          question={question}
          person={person}
          consentReminder={settings.consentReminder}
          starting={starting}
          onStart={startListening}
          onBack={() => go("who", "back")}
        />
      )}

      {step === "listening" && (
        <ListeningStep
          question={asking ? asking.asked : question}
          followUpLabel={asking ? followUpLabel : undefined}
          person={draft?.person ?? person}
          elapsed={simulated ? simElapsed : recorder.elapsed}
          analyserRef={recorder.analyserRef}
          simulated={simulated}
          paused={paused}
          problem={listenProblem}
          starting={starting}
          canPreview={canPreview}
          onStop={() => void stopListening()}
          onPause={pauseListening}
          onResume={resumeListening}
          onCancel={() => {
            if (!listenProblem) return setConfirm("recording");
            if (asking) {
              setAsking(null);
              return go("review", "back");
            }
            leave();
          }}
          onRetry={() => void beginRecording()}
          onPreviewWithoutMic={previewWithoutMic}
        />
      )}

      {step === "processing" && (
        <ProcessingStep
          question={asking ? asking.asked : question}
          durationSec={stoppedAt ?? recordings[0]?.durationSec ?? null}
          title={asking ? (asking.kind === "more" ? "Finding what they added" : "Making it clear") : undefined}
          onCancel={() => setConfirm("recording")}
        />
      )}

      {step === "review" && draft && (
        <ReviewStep
          question={question}
          draft={draft}
          extra={extra}
          onPersonChange={(next, label) => setDraft({ ...draft, speakers: next, person: label })}
          recordings={recordings}
          preview={preview}
          saving={saving}
          note={note}
          fresh={fresh}
          onLooksRight={() => void save(draft)}
          onEdit={(index) => {
            setEditFocus(index ?? null);
            go("edit");
          }}
          onClarify={clarify}
          onKeepAsIs={keepAsIs}
          onAskMore={askForMore}
          onSwapExtra={swapExtra}
          onClose={() => setConfirm("result")}
        />
      )}

      {step === "edit" && draft && (
        <EditStep
          question={question}
          draft={draft}
          focusIndex={editFocus}
          saveLabel={manual ? "Save" : "Done"}
          onSave={finishEditing}
          onCancel={() => go(manual ? "problem" : "review", "back")}
        />
      )}

      {step === "problem" && (
        <ProblemStep
          kind={problem}
          question={question}
          recording={recordings[0] ?? null}
          onRetry={() => {
            if (!recordings[0]) return;
            go("processing");
            void findThings(recordings[0], person);
          }}
          onRecordAgain={() => {
            setRecordings([]);
            go("ready", "back");
          }}
          onWriteYourself={writeYourself}
          onClose={() => setConfirm("result")}
        />
      )}

      {step === "saved" && saved && <SavedStep capture={saved} introduced={introduced} onDone={leave} />}

      <Sheet
        open={confirm === "recording"}
        title={asking ? "Stop this follow-up?" : "Stop without keeping this?"}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="ink" block onClick={discardRecording}>
              {asking ? "Stop follow-up" : "Discard recording"}
            </Button>
            <Button variant="text" block size="md" onClick={() => setConfirm(null)}>
              {step === "processing" ? "Keep going" : "Keep listening"}
            </Button>
          </>
        }
      >
        {asking ? "The three things you already have stay as they are." : "Nothing from this conversation will be saved."}
      </Sheet>

      <Sheet
        open={confirm === "result"}
        title="Leave without saving?"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="ink" block onClick={discardRecording}>
              Discard
            </Button>
            <Button variant="text" block size="md" onClick={() => setConfirm(null)}>
              Keep reviewing
            </Button>
          </>
        }
      >
        {draft?.person.trim() ? `${draft.person.trim()}’s` : "Their"} answer won’t be kept.
      </Sheet>
    </main>
  );
}
