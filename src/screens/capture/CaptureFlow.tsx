import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import type { Draft } from "../../components/ThingsEditor";
import { saveRecording } from "../../lib/audio/audioStore";
import { useRecorder } from "../../lib/audio/useRecorder";
import { useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { detectMode, findThreeThings, NothingHeardError } from "../../lib/distill/client";
import { newId, tidyQuestion } from "../../lib/format";
import { useStore } from "../../lib/store";
import { withTransition, type Direction } from "../../lib/transition";
import type { Capture, Recording } from "../../lib/types";
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

/** Long enough for "Got it." and "Finding the three things" to read as care, not delay. */
const MIN_PROCESSING_MS = 4800;
/** A safety net for a phone left recording, not a limit on conversation. */
const MAX_RECORDING_SEC = 30 * 60;

/**
 * Ask → Who → Ready → Listen → Understand → 3 Things → Save.
 * One screen at a time, with the question carried through every step.
 */
export function CaptureFlow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings, saveCapture } = useStore();

  const recorder = useRecorder();
  const answer = useSpeechRecognition({ continuous: true });

  const initialQuestion = tidyQuestion(params.get("q") ?? "");
  const [step, setStep] = useState<Step>(initialQuestion ? "who" : "ask");
  const [askMode, setAskMode] = useState<"voice" | "type">(params.get("type") ? "type" : "voice");
  const [question, setQuestion] = useState(initialQuestion);
  const [person, setPerson] = useState("");

  const [starting, setStarting] = useState(false);
  const [listenProblem, setListenProblem] = useState<ListeningProblem | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [simElapsed, setSimElapsed] = useState(0);
  const [simPaused, setSimPaused] = useState(false);
  const [canPreview, setCanPreview] = useState(false);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

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

  const startListening = () => {
    // Called straight from the tap so the browser treats the microphone request as user-initiated.
    void beginRecording();
    go("listening");
  };

  const previewWithoutMic = () => {
    stopping.current = false;
    setListenProblem(null);
    setSimulated(true);
    setSimPaused(false);
    setSimElapsed(0);
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
            setQuestion(tidyQuestion(q));
            go("who");
          }}
          onClose={leave}
        />
      )}

      {step === "who" && (
        <WhoStep
          question={question}
          person={person}
          onPersonChange={setPerson}
          onContinue={() => go("ready")}
          onSkip={() => {
            setPerson("");
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
          question={question}
          person={person}
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
          onCancel={() => (listenProblem ? leave() : setConfirm("recording"))}
          onRetry={() => void beginRecording()}
          onPreviewWithoutMic={previewWithoutMic}
        />
      )}

      {step === "processing" && (
        <ProcessingStep
          question={question}
          durationSec={stoppedAt ?? recording?.durationSec ?? null}
          onCancel={() => setConfirm("recording")}
        />
      )}

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
          onCancel={() => go(manual ? "problem" : "review", "back")}
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
            go("ready", "back");
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
