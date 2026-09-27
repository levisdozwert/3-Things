import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { saveRecording } from "../audio/audioStore";
import { useStore } from "../store";
import type { Outgoing } from "../types";
import type { ReceivedAnswer } from "./contract";
import { captureIdFor } from "./receive";
import { detectRelay, relayFor } from "./relay";

export interface Arrival {
  captureId: string;
  name: string;
  question: string;
}

const EVERY_MS = 20_000;

function asBlob(dataUrl: string): Blob {
  const [head, data] = dataUrl.split(",");
  const type = head.match(/data:([^;]+)/)?.[1] ?? "audio/webm";
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

/** Questions that could still change: waiting for someone, or open to anyone. */
const stillOpen = (o: Outgoing) => o.speakers.length === 0 || o.state !== "answered";

/**
 * Brings answers home. While the app is open it checks, quietly, on each
 * screen change and every little while. An answer becomes a conversation in
 * the Library; only once it's safely there does the relay forget it.
 */
export function useRemoteSync(onArrive: (arrivals: Arrival[]) => void) {
  const { outgoing, getCapture, receiveStatus, settings } = useStore();
  const location = useLocation();
  const latest = useRef({ outgoing, getCapture, receiveStatus, keep: settings.keepRecordings, onArrive });
  latest.current = { outgoing, getCapture, receiveStatus, keep: settings.keepRecordings, onArrive };
  const busy = useRef(false);

  const sync = useCallback(async () => {
    if (busy.current) return;
    const { outgoing, getCapture, receiveStatus, keep, onArrive } = latest.current;
    const open = outgoing.filter(stillOpen);
    if (open.length === 0) return;
    busy.current = true;
    const arrivals: Arrival[] = [];
    try {
      for (const via of ["server", "local"] as const) {
        const items = open.filter((o) => o.via === via);
        if (items.length === 0) continue;
        if (via === "server" && (await detectRelay()) !== "server") continue;
        const relay = relayFor(via);
        const statuses = await relay.status(items.map(({ id, ownerKey }) => ({ id, ownerKey })));
        for (const status of statuses) {
          const question = items.find((o) => o.id === status.id);
          if (!question || status.state === "gone") continue;

          // Already in the Library from an earlier check: now the relay can forget them.
          const kept = status.answers.filter((a) => getCapture(captureIdFor(a)));
          if (kept.length) await relay.collect(question.id, question.ownerKey, kept.map((a) => a.id));

          const fresh: ReceivedAnswer[] = status.answers.filter((a) => !getCapture(captureIdFor(a)));
          const withAudio: string[] = [];
          if (keep) {
            for (const a of fresh) {
              if (!a.audio?.length) continue;
              if (await saveRecording(captureIdFor(a), a.audio.map(asBlob))) withAudio.push(captureIdFor(a));
            }
          }
          if (fresh.length || status.state !== question.state) receiveStatus(status, withAudio);
          arrivals.push(
            ...fresh.map((a) => ({
              captureId: captureIdFor(a),
              name: question.person || a.name.trim() || "Someone",
              question: question.question,
            })),
          );
        }
      }
    } catch {
      /* offline or unreachable: try again later */
    } finally {
      busy.current = false;
    }
    if (arrivals.length) onArrive(arrivals);
  }, []);

  // On each screen change…
  useEffect(() => {
    void sync();
  }, [location.pathname, sync]);

  // …every little while, when the app comes back into view, and when another tab answers.
  useEffect(() => {
    const interval = window.setInterval(() => void sync(), EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && void sync();
    const onStorage = (e: StorageEvent) => e.key === "three-things:relay" && void sync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [sync]);
}
