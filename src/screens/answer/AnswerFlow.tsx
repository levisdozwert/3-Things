import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { Button, IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Mark, Wordmark } from "../../components/Mark";
import { Orb } from "../../components/Orb";
import { Sheet } from "../../components/Sheet";
import { ThingList } from "../../components/ThingList";
import type { Draft } from "../../components/ThingsEditor";
import { Toggle } from "../../components/Toggle";
import { useRecorder } from "../../lib/audio/useRecorder";
import { useSpeechRecognition } from "../../lib/audio/useSpeechRecognition";
import { detectMode, findThreeThings, followUpThings, NothingHeardError } from "../../lib/distill/client";
import { newId } from "../../lib/format";
import type { AnswerPayload, PublicQuestion } from "../../lib/remote/contract";
import { openQuestion, type Relay } from "../../lib/remote/relay";
import { withTransition, type Direction } from "../../lib/transition";
import type { Recording, Thing } from "../../lib/types";
import { EditStep } from "../capture/EditStep";
import flow from "../capture/Flow.module.css";
import { ListeningStep, type ListeningProblem } from "../capture/ListeningStep";
import { ProcessingStep } from "../capture/ProcessingStep";
import { ReviewStep } from "../capture/ReviewStep";
import styles from "./AnswerFlow.module.css";

type Step =
  | "loading"
  | "gone"
  | "closed"
  | "landing"
  | "typing"
  | "listening"
  | "processing"
  | "review"
  | "edit"
  | "problem"
  | "sent";

const MIN_PROCESSING_MS = 4800;
const MIN_FOLLOW_UP_MS = 3400;
const ANSWERED_KEY = "three-things:answered";

/** This phone remembers what it has answered, so a link opened again says so. */
function answeredHere(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ANSWERED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function rememberAnswered(id: string) {
  try {
    localStorage.setItem(ANSWERED_KEY, JSON.stringify([...new Set([...answeredHere(), id])]));
  } catch {
    /* fine: the relay knows too */
  }
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const settle = (started: number, minimum: number) =>
  new Promise((r) => setTimeout(r, Math.max(0, minimum - (performance.now() - started))));

/**
 * Someone asked you for 3. Tap the link, see the question, answer by voice.
 * No app, no account. Nothing leaves this phone until you've reviewed it and
 * tapped Send; your recording stays here unless you allow it to go too.
 */
export function AnswerFlow() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  // The asker looking at what the other person will see. Doesn't count as opened.
  const peek = params.get("preview") === "1";

  const recorder = useRecorder();
  const speech = useSpeechRecognition({ continuous: true });

  const [step, setStep] = useState<Step>("loading");
  const [found, setFound] = useState<{ question: PublicQuestion; relay: Relay } | null>(null);
  const [allowAudio, setAllowAudio] = useState(false);
  const [canPreview, setCanPreview] = useState(false);

  const [starting, setStarting] = useState(false);
  const [listenProblem, setListenProblem] = useState<ListeningProblem | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [simElapsed, setSimElapsed] = useState(0);
  const [simPaused, setSimPaused] = useState(false);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [typed, setTyped] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [extra, setExtra] = useState<Thing | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [addingMore, setAddingMore] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sample, setSample] = useState<string | undefined>();
  const [heardNothing, setHeardNothing] = useState(false);
  const [editFocus, setEditFocus] = useState<number | null>(null);

  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<"recording" | "review" | null>(null);

  const generation = useRef(0);
  const stopping = useRef(false);

  const go = useCallback((next: Step, direction: Direction = "forward") => withTransition(() => setStep(next), direction), []);

  // A private question: never indexed, even if a link ends up somewhere public.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    let alive = true;
    void detectMode().then((mode) => alive && setCanPreview(mode === "preview"));
    void openQuestion(id, { peek }).then((result) => {
      if (!alive) return;
      if (!result) return setStep("gone");
      setFound(result);
      const answered = result.question.answered || (!peek && answeredHere().includes(id));
      setStep(answered ? "closed" : "landing");
    });
    return () => {
      alive = false;
    };
  }, [id, peek]);

  const asker = found?.question.askerName.trim() || "Someone";

  // ── Speaking ───────────────────────────────────────────────

  const beginRecording = async () => {
    stopping.current = false;
    setStarting(true);
    setListenProblem(null);
    setSimulated(false);
    const status = await recorder.start();
    setStarting(false);
    if (status === "recording") speech.start();
    else setListenProblem(status === "denied" ? "denied" : status === "failed" ? "failed" : "unavailable");
  };

  const previewWithoutMic = () => {
    stopping.current = false;
    setListenProblem(null);
    setSimulated(true);
    setSimPaused(false);
    setSimElapsed(0);
  };

  const startListening = () => {
    if (recordings[0]?.simulated) previewWithoutMic();
    else void beginRecording();
    go("listening");
  };

  useEffect(() => {
    if (step !== "listening" || !simulated || simPaused) return;
    const t = window.setInterval(() => setSimElapsed((s) => s + 0.25), 250);
    return () => window.clearInterval(t);
  }, [step, simulated, simPaused]);

  const { abort: abortSpeech } = speech;
  useEffect(() => {
    if (step !== "listening" || recorder.status !== "failed") return;
    abortSpeech();
    setListenProblem("failed");
  }, [step, recorder.status, abortSpeech]);

  // ── Understanding ─────────────────────────────────────────

  const understand = async (rec: Recording) => {
    if (!found) return;
    const run = ++generation.current;
    const started = performance.now();
    try {
      const result = await findThreeThings(
        { question: found.question.question, transcript: rec.transcript, person: found.question.forName || undefined },
        { preview: rec.simulated },
      );
      await settle(started, MIN_PROCESSING_MS);
      if (run !== generation.current) return;
      setPreview(result.mode === "preview");
      setSample(result.sample);
      setNote(null);
      setFresh([]);
      // You're the one who said it: nothing is "unclear" to you. Edit it if it needs it.
      setDraft({
        person: "",
        speakers: [],
        topic: result.response.topic,
        place: result.response.place,
        things: result.response.things.map((t) => ({ id: newId(), ...t, unclear: undefined })),
      });
      setExtra(result.response.extra ? { id: newId(), ...result.response.extra, unclear: undefined } : null);
      go("review");
    } catch (error) {
      await settle(started, MIN_PROCESSING_MS);
      if (run !== generation.current) return;
      setHeardNothing(error instanceof NothingHeardError);
      go("problem");
    }
  };

  const addMore = async (rec: Recording, current: Draft, earlier: Recording[]) => {
    if (!found) return;
    const run = ++generation.current;
    const started = performance.now();
    const want = 3 - current.things.length;
    try {
      const things = await followUpThings(
        {
          question: found.question.question,
          transcript: earlier.map((r) => r.transcript).join(" "),
          person: found.question.forName || undefined,
          followUp: {
            kind: "more",
            asked: "Is there one more thing you’d add?",
            transcript: rec.transcript,
            keep: current.things.map(({ headline, detail, quote, said }) => ({ headline, detail, quote: quote ?? "", ...(said ? { said } : {}) })),
            want: want === 2 ? 2 : 1,
          },
        },
        { preview: preview || rec.simulated, sample },
      );
      await settle(started, MIN_FOLLOW_UP_MS);
      if (run !== generation.current) return;
      if (things.length === 0) {
        setNote("Nothing new came up in that. What you have is fine to send");
        setFresh([]);
      } else {
        const added = things.map((t) => ({ id: newId(), ...t, unclear: undefined }));
        setDraft({ ...current, things: [...current.things, ...added] });
        setFresh(added.map((t) => t.id));
        setNote(null);
      }
    } catch {
      await settle(started, MIN_FOLLOW_UP_MS);
      setNote("Something interrupted that. Nothing changed");
    }
    setAddingMore(false);
    go("review", "none");
  };

  const finish = async () => {
    if (stopping.current) return;
    stopping.current = true;
    navigator.vibrate?.(12);
    setStoppedAt(simulated ? simElapsed : recorder.elapsed);
    go("processing", "none");
    let rec: Recording;
    if (simulated) {
      rec = { audio: null, durationSec: simElapsed, transcript: "", simulated: true };
    } else {
      const [stopped, transcript] = await Promise.all([recorder.stop(), speech.stop()]);
      rec = { audio: stopped.blob, durationSec: stopped.durationSec, transcript, simulated: false };
    }
    if (addingMore && draft) {
      setRecordings([...recordings, rec]);
      void addMore(rec, draft, recordings);
    } else {
      setRecordings([rec]);
      void understand(rec);
    }
  };

  const discard = () => {
    generation.current++;
    recorder.discard();
    speech.abort();
    setConfirm(null);
    if (addingMore && draft) {
      setAddingMore(false);
      return go("review", "back");
    }
    setRecordings([]);
    setDraft(null);
    go("landing", "back");
  };

  // ── Sending ────────────────────────────────────────────────

  const send = async (as = "") => {
    if (!found || !draft) return;
    // A link for anyone: they say what the asker should call them, once, at the end.
    if (!found.question.forName && !as.trim()) return setNaming(true);
    setSending(true);
    try {
      const shareAudio = allowAudio && found.question.wantsAudio;
      const audio = shareAudio ? await Promise.all(recordings.flatMap((r) => (r.audio ? [asDataUrl(r.audio)] : []))) : [];
      const payload: AnswerPayload = {
        name: as.trim(),
        things: draft.things
          .filter((t) => t.headline.trim())
          .slice(0, 3)
          .map((t) => ({ headline: t.headline.trim(), detail: t.detail.trim(), ...(t.said ? { said: t.said } : {}) })),
        topic: draft.topic || "Life",
        ...(draft.place?.trim() ? { place: draft.place.trim() } : {}),
        durationSec: Math.round(recordings.reduce((n, r) => n + r.durationSec, 0)),
        ...(audio.length ? { audio } : {}),
      };
      const result = await found.relay.answer(id, payload);
      if (result === "sent") {
        rememberAnswered(id);
        setNaming(false);
        go("sent");
      } else if (result === "gone") go("gone");
      else if (result === "closed") go("closed");
      else setNote("That couldn’t be sent. Check it and try again");
    } catch {
      setNote("That couldn’t be sent. Check your connection and try again");
    } finally {
      setSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <main className={`${flow.flow} ${styles.quiet}`}>
        <Mark live size="sm" />
      </main>
    );
  }

  if (step === "gone" || !found) {
    return (
      <main className={`${flow.flow} ${styles.center}`}>
        <Mark size="md" tone="muted" />
        <p className={`serif ${styles.message}`}>This question is no longer available.</p>
      </main>
    );
  }

  const q = found.question;

  if (step === "closed") {
    return (
      <main className={`${flow.flow} ${styles.center}`}>
        <Mark size="md" />
        <p className={`serif ${styles.message}`}>
          {peek ? `${q.forName || "They"} already answered.` : `You’ve already sent your 3 to ${asker}.`}
        </p>
        {!peek && <p className={styles.thanks}>Thanks for sharing what you know.</p>}
      </main>
    );
  }

  return (
    <main className={flow.flow} data-step={step}>
      {step === "landing" && (
        <>
          <div className={flow.topbar}>
            <span className={styles.brand}>
              <Wordmark />
            </span>
          </div>

          <div className={`${flow.content} ${styles.landing}`}>
            {peek && (
              <p className={styles.peek}>
                What {q.forName || "they"} will see. An answer sent from here would come back as{" "}
                {q.forName ? `${q.forName}’s` : "theirs"}.
              </p>
            )}
            <p className={`${styles.asked} ${flow.enter}`}>
              <Avatar name={asker} size="sm" />
              <span>
                <strong>{asker}</strong> asked you for 3
              </span>
            </p>
            <h1 className={`${flow.question} ${flow.questionXL} ${styles.question}`}>“{q.question}”</h1>
            <p className={`${styles.lede} ${flow.enterLate}`}>
              Just talk naturally. You don’t need to organize your answer perfectly.
            </p>

            <div className={`${styles.trust} ${flow.enterLate}`}>
              <p>
                <Icon name="check" size={16} strokeWidth={2} />
                Your answer will be shared with {asker} after you review it.
              </p>
              <p>
                <Icon name="mic" size={16} strokeWidth={1.8} />
                {q.wantsAudio && allowAudio
                  ? `Your recording is used to create your 3 Things, and ${asker} can keep it.`
                  : "Your recording is used to create your 3 Things. It stays on this phone."}
              </p>
              {q.wantsAudio && (
                <div className={styles.allow}>
                  <span>
                    <span className={styles.allowTitle}>Allow {asker} to keep the original recording</span>
                    <span className={styles.allowDetail}>Off unless you choose it. Your 3 Things are shared either way.</span>
                  </span>
                  <Toggle label={`Allow ${asker} to keep the original recording`} checked={allowAudio} onChange={setAllowAudio} />
                </div>
              )}
            </div>
          </div>

          <div className={`${flow.footer} ${styles.footer}`}>
            <Orb label="Answer by voice" onClick={startListening} disabled={starting} transitionName="voice-forms">
              <Icon name="mic" size={36} strokeWidth={1.6} />
            </Orb>
            <Button variant="text" size="md" icon="keyboard" onClick={() => go("typing")}>
              Type instead
            </Button>
          </div>
        </>
      )}

      {step === "typing" && (
        <>
          <div className={flow.topbar}>
            <IconButton icon="back" label="Back" onClick={() => go("landing", "back")} />
          </div>
          <div className={`${flow.content} ${styles.typing}`}>
            <p className={`${flow.question} ${flow.questionSM}`}>{q.question}</p>
            <label htmlFor="typed-answer" className={flow.label}>
              Your answer
            </label>
            <textarea
              id="typed-answer"
              className={styles.textarea}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Write it the way you’d say it. We’ll turn it into three clear things."
              autoFocus
              rows={7}
            />
          </div>
          <div className={flow.footer}>
            <Button
              block
              disabled={typed.trim().split(/\s+/).length < 4}
              onClick={() => {
                const rec = { audio: null, durationSec: 0, transcript: typed.trim(), simulated: false };
                setRecordings([rec]);
                setStoppedAt(null);
                go("processing");
                void understand(rec);
              }}
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {step === "listening" && (
        <ListeningStep
          question={q.question}
          person=""
          label={addingMore ? "Anything else?" : "Your answer"}
          prompt="Speak naturally. We’ll turn what you say into three clear things."
          finishLabel="Finish"
          elapsed={simulated ? simElapsed : recorder.elapsed}
          analyserRef={recorder.analyserRef}
          simulated={simulated}
          paused={simulated ? simPaused : recorder.status === "paused"}
          problem={listenProblem}
          starting={starting}
          canPreview={canPreview}
          onStop={() => void finish()}
          onPause={() => {
            if (simulated) return setSimPaused(true);
            recorder.pause();
            speech.pause();
          }}
          onResume={() => {
            if (simulated) return setSimPaused(false);
            recorder.resume();
            speech.resume();
          }}
          onCancel={() => (listenProblem ? discard() : setConfirm("recording"))}
          onRetry={() => void beginRecording()}
          onPreviewWithoutMic={previewWithoutMic}
          onType={() => {
            recorder.discard();
            setListenProblem(null);
            go("typing");
          }}
        />
      )}

      {step === "processing" && (
        <ProcessingStep
          question={q.question}
          durationSec={stoppedAt}
          title={addingMore ? "Finding what you added" : "Finding your three things"}
          onCancel={() => setConfirm("recording")}
        />
      )}

      {step === "review" && draft && (
        <ReviewStep
          answering={{ askerName: asker }}
          question={q.question}
          draft={draft}
          extra={extra}
          onPersonChange={() => {}}
          recordings={recordings}
          preview={preview}
          saving={sending}
          note={note}
          fresh={fresh}
          onLooksRight={() => void send(name)}
          onEdit={(index) => {
            setEditFocus(index ?? null);
            go("edit");
          }}
          onClarify={() => {}}
          onKeepAsIs={() => {}}
          onAskMore={() => {
            setAddingMore(true);
            setNote(null);
            startListening();
          }}
          onSwapExtra={(index) => {
            if (!extra) return;
            const replaced = draft.things[index];
            const incoming = { ...extra, id: newId() };
            setDraft({ ...draft, things: draft.things.map((t, i) => (i === index ? incoming : t)) });
            setExtra(replaced);
            setFresh([incoming.id]);
          }}
          onClose={() => setConfirm("review")}
        />
      )}

      {step === "edit" && draft && (
        <EditStep
          own
          question={q.question}
          draft={draft}
          focusIndex={editFocus}
          saveLabel="Done"
          onSave={(value) => {
            setDraft(value);
            setFresh([]);
            go("review", "back");
          }}
          onCancel={() => go("review", "back")}
        />
      )}

      {step === "problem" && (
        <>
          <div className={flow.topbar}>
            <IconButton icon="close" label="Close" onClick={() => go("landing", "back")} />
          </div>
          <div className={`${flow.content} ${styles.center}`}>
            <p className={`serif ${styles.message}`}>
              {heardNothing ? "We couldn’t make out your answer." : "Something interrupted that."}
            </p>
            <p className={styles.thanks}>Nothing was shared. Try again, or type it instead.</p>
          </div>
          <div className={flow.footer}>
            <Button block icon="mic" onClick={startListening}>
              Try again
            </Button>
            <Button block variant="text" size="md" icon="keyboard" onClick={() => go("typing")}>
              Type instead
            </Button>
          </div>
        </>
      )}

      {step === "sent" && draft && (
        <>
          <div className={flow.topbar}>
            <span className={styles.brand}>
              <Wordmark />
            </span>
          </div>
          <div className={`${flow.content} ${styles.sent}`}>
            <span className={`${styles.check} ${flow.enter}`}>
              <Icon name="check" size={22} strokeWidth={2.2} />
            </span>
            <h1 className={`serif ${styles.sentTitle} ${flow.enter}`}>Sent to {asker}</h1>
            <p className={`${styles.thanks} ${flow.enterLate}`}>Thanks for sharing what you know.</p>
            <div className={`${styles.keepsake} ${flow.enterLate}`}>
              <p className={`serif ${styles.keepsakeQuestion}`}>{q.question}</p>
              <ThingList things={draft.things} />
            </div>
          </div>
          <div className={`${flow.footer} ${styles.explore}`}>
            {found.relay.kind === "local" && (
              <p className={styles.previewNote}>
                In this preview you’re on both sides. Open 3 Things to see it arrive for {asker}.
              </p>
            )}
            <p>Want to keep your own 3 Things?</p>
            <Link to="/" viewTransition className={styles.exploreLink}>
              Explore 3 Things
            </Link>
          </div>
        </>
      )}

      <Sheet
        open={naming}
        title={`What should ${asker} call you?`}
        onClose={() => setNaming(false)}
        actions={
          <>
            <Button variant="ink" block disabled={!name.trim() || sending} onClick={() => void send(name)}>
              Send my {draft?.things.length ?? 3}
            </Button>
            <Button variant="text" size="md" block onClick={() => setNaming(false)}>
              Not yet
            </Button>
          </>
        }
      >
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && void send(name)}
          placeholder="Your name"
          aria-label={`What should ${asker} call you?`}
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={48}
          enterKeyHint="send"
          data-autofocus
        />
        <p className={styles.nameHint}>So {asker} knows who these 3 Things are from. It’s shared only with {asker}.</p>
      </Sheet>

      <Sheet
        open={confirm !== null}
        title={confirm === "review" ? "Leave without sending?" : "Stop without sending?"}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="ink" block onClick={discard}>
              {confirm === "review" ? "Leave" : "Stop"}
            </Button>
            <Button variant="text" size="md" block onClick={() => setConfirm(null)}>
              {confirm === "review" ? "Keep reviewing" : "Keep going"}
            </Button>
          </>
        }
      >
        Nothing has been shared with {asker}.
      </Sheet>
    </main>
  );
}
