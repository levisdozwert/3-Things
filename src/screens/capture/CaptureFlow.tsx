import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import type { Draft } from "../../components/ThingsEditor";
import { saveRecording } from "../../lib/audio/audioStore";
import { useRecorder } from "../../lib/audio/useRecorder";
import { useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { findThreeThings, NothingHeardError } from "../../lib/distill/client";
import { newId, tidyQuestion } from "../../lib/format";
import { useStore } from "../../lib/store";
import { withTransition } from "../../lib/transition";
import type { Capture, Recording } from "../../lib/types";
import { AskStep } from "./AskStep";
import { EditStep } from "./EditStep";
import flow from "./Flow.module.css";
import { ListeningStep } from "./ListeningStep";
import { ProblemStep, type Problem } from "./ProblemStep";
import { ProcessingStep } from "./ProcessingStep";
import { ReadyStep } from "./ReadyStep";
import { ReviewStep } from "./ReviewStep";
import { SavedStep } from "./SavedStep";

type Step = "ask" | "ready" | "listening" | "processing" | "review" | "edit" | "saved" | "problem";

/** Long enough for "Finding the three things" to read as care, not delay. */
const MIN_PROCESSING_MS = 3600;
const MAX_RECORDING_SEC = 10 * 60;

/**
 * Ask → Listen → Understand → 3 Things → Save.
 * One screen at a time, with the question carried through every step.
 */
export function CaptureFlow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings, saveCapture } = useStore();

  const recorder = useRecorder();
  const answer = useSpeechRecognition({ continuous: true });

  const initialQuestion = tidyQuestion(params.get("q") ?? "");
  const [step, setStep] = useState<Step>(initialQuestion ? "ready" : "ask");
  const [askMode, setAskMode] = useState<"voice" | "type">(params.get("type") ? "type" : "voice");
  const [question, setQuestion] = useState(initialQuestion);
  const [person, setPerson] = useState("");

  const [starting, setStarting] = useState(false);
  const [blocked, setBlocked] = useState<"denied" | "unavailable" | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [simElapsed, setSimElapsed] = useState(0);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState(false);
  const [manual, setManual] = useState(false);
  const [problem, setProblem] = useState<Problem>("failed");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Capture | null>(null);
  const [confirm, setConfirm] = useState<"recording" | "result" | null>(null);

  // Bumped whenever in-flight work should be ignored (cancel, retry, start over).
  const generation = useRef(0);
  // One stop per recording, however many times Stop is tapped.
  const stopping = useRef(false);

  const go = useCallback((next: Step) => withTransition(() => setStep(next)), []);
  const leave = useCallback(() => navigate("/", { viewTransition: true }), [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // ── Listening ──────────────────────────────────────────────

  const beginRecording = async () => {
    stopping.current = false;
    setStarting(true);
    setBlocked(null);
    setSimulated(false);
    const status = await recorder.start();
    setStarting(false);
    if (status === "recording") {
      answer.start();
    } else {
      setBlocked(status === "denied" ? "denied" : "unavailable");
    }
  };

  const startListening = () => {
    // Called straight from the tap so the browser treats the microphone request as user-initiated.
    void beginRecording();
    go("listening");
  };

  const previewWithoutMic = () => {
    stopping.current = false;
    setBlocked(null);
    setSimulated(true);
    setSimElapsed(0);
  };

  useEffect(() => {
    if (step !== "listening" || !simulated) return;
    const started = performance.now();
    const timer = window.setInterval(() => setSimElapsed(Math.floor((performance.now() - started) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [step, simulated]);

  const findThings = useCallback(
    async (rec: Recording, heardFrom: string) => {
      const run = ++generation.current;
      const started = performance.now();
      const settle = () => new Promise((r) => setTimeout(r, Math.max(0, MIN_PROCESSING_MS - (performance.now() - started))));
      try {
        const { response, mode } = await findThreeThings(
          { question, transcript: rec.transcript, person: heardFrom },
          { preview: rec.simulated },
        );
        await settle();
        if (run !== generation.current) return;
        setPreview(mode === "preview");
        setManual(false);
        setDraft({
          person: heardFrom,
          topic: response.topic,
          things: response.things.map((t) => ({ id: newId(), ...t })),
        });
        go("review");
      } catch (error) {
        await settle();
        if (run !== generation.current) return;
        setProblem(error instanceof NothingHeardError ? "nothing-heard" : "failed");
        go("problem");
      }
    },
    [question, go],
  );

  const stopListening = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    go("processing");
    let rec: Recording;
    if (simulated) {
      rec = { audio: null, durationSec: simElapsed, transcript: "", simulated: true };
    } else {
      const [stopped, transcript] = await Promise.all([recorder.stop(), answer.stop()]);
      rec = { audio: stopped.blob, durationSec: stopped.durationSec, transcript, simulated: false };
    }
    setRecording(rec);
    void findThings(rec, person);
  }, [go, simulated, simElapsed, recorder, answer, findThings, person]);

  useEffect(() => {
    if (step === "listening" && recorder.elapsed >= MAX_RECORDING_SEC) void stopListening();
  }, [step, recorder.elapsed, stopListening]);

  const discardRecording = () => {
    generation.current++;
    recorder.discard();
    answer.abort();
    setConfirm(null);
    leave();
  };

  // ── Saving ─────────────────────────────────────────────────

  const save = async (value: Draft, edited: boolean) => {
    setSaving(true);
    const id = newId();
    const things = value.things
      .filter((t) => t.headline.trim())
      .map((t) => ({ ...t, headline: t.headline.trim(), detail: t.detail.trim() }));
    const hasAudio = settings.keepRecordings && recording?.audio ? await saveRecording(id, recording.audio) : false;
    const capture: Capture = {
      id,
      question,
      person: value.person.trim(),
      topic: value.topic || "Life",
      things,
      recordedAt: new Date().toISOString(),
      durationSec: Math.round(recording?.durationSec ?? 0),
      hasAudio,
      origin: manual ? "manual" : "recording",
      ...(edited && !manual ? { edited: true } : {}),
      ...(preview && !manual ? { preview: true } : {}),
    };
    saveCapture(capture);
    setSaved(capture);
    setSaving(false);
    go("saved");
  };

  const writeYourself = () => {
    setManual(true);
    setPreview(false);
    setDraft({ person, topic: "", things: [{ id: newId(), headline: "", detail: "" }] });
    go("edit");
  };

  const startOver = () => {
    generation.current++;
    setQuestion("");
    setPerson("");
    setRecording(null);
    setDraft(null);
    setSaved(null);
    setManual(false);
    setPreview(false);
    setSimulated(false);
    setAskMode("voice");
    go("ask");
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <main className={flow.flow} data-step={step}>
      {step === "ask" && (
        <AskStep
          initialMode={askMode}
          initialText={question}
          onContinue={(q) => {
            setQuestion(q);
            go("ready");
          }}
          onClose={leave}
        />
      )}

      {step === "ready" && (
        <ReadyStep
          question={question}
          person={person}
          onPersonChange={setPerson}
          consentReminder={settings.consentReminder}
          starting={starting}
          onEditQuestion={() => {
            setAskMode("type");
            go("ask");
          }}
          onStart={startListening}
          onClose={leave}
        />
      )}

      {step === "listening" && (
        <ListeningStep
          question={question}
          elapsed={simulated ? simElapsed : recorder.elapsed}
          analyserRef={recorder.analyserRef}
          simulated={simulated}
          blocked={blocked}
          starting={starting}
          onStop={() => void stopListening()}
          onCancel={() => (blocked ? leave() : setConfirm("recording"))}
          onRetry={() => void beginRecording()}
          onContinueWithoutMic={previewWithoutMic}
        />
      )}

      {step === "processing" && <ProcessingStep question={question} onCancel={() => setConfirm("recording")} />}

      {step === "review" && draft && (
        <ReviewStep
          question={question}
          draft={draft}
          onPersonChange={(name) => setDraft({ ...draft, person: name })}
          recording={recording}
          preview={preview}
          saving={saving}
          onLooksRight={() => void save(draft, false)}
          onEdit={() => go("edit")}
          onClose={() => setConfirm("result")}
        />
      )}

      {step === "edit" && draft && (
        <EditStep
          question={question}
          draft={draft}
          onSave={(value) => {
            setDraft(value);
            void save(value, true);
          }}
          onCancel={() => go(manual ? "problem" : "review")}
        />
      )}

      {step === "problem" && (
        <ProblemStep
          kind={problem}
          question={question}
          recording={recording}
          onRetry={() => {
            if (!recording) return;
            go("processing");
            void findThings(recording, person);
          }}
          onRecordAgain={() => {
            setRecording(null);
            go("ready");
          }}
          onWriteYourself={writeYourself}
          onClose={() => setConfirm("result")}
        />
      )}

      {step === "saved" && saved && <SavedStep capture={saved} onAskAnother={startOver} onDone={leave} />}

      <Sheet
        open={confirm === "recording"}
        title="Stop without keeping this?"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="ink" block onClick={discardRecording}>
              Discard recording
            </Button>
            <Button variant="text" block size="md" onClick={() => setConfirm(null)}>
              {step === "processing" ? "Keep going" : "Keep listening"}
            </Button>
          </>
        }
      >
        Nothing from this conversation will be saved.
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
