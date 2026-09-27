import { useCallback, useEffect, useState } from "react";

export type MicrophoneAccess = "allowed" | "ask" | "blocked" | "unavailable";

/**
 * Whether 3 Things can use the microphone, in plain terms. Asking happens
 * only when the user taps, never on its own.
 */
export function useMicrophoneAccess() {
  const [access, setAccess] = useState<MicrophoneAccess>(() =>
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" ? "ask" : "unavailable",
  );

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== "function" || typeof navigator.permissions?.query !== "function") return;
    let status: PermissionStatus | undefined;
    const read = (state: PermissionState) => setAccess(state === "granted" ? "allowed" : state === "denied" ? "blocked" : "ask");
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((s) => {
        status = s;
        read(s.state);
        s.onchange = () => read(s.state);
      })
      .catch(() => {
        /* Some browsers can't say until asked. */
      });
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const request = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setAccess("allowed");
    } catch {
      setAccess("blocked");
    }
  }, []);

  return { access, request };
}
