import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Keeps edits safe without an explicit save.
 *
 * Layers, weakest to strongest:
 *   1. debounced save while typing
 *   2. immediate flush on blur, unmount, and tab-hide
 *   3. a localStorage mirror written on every keystroke, so even a crash or a
 *      force-quit leaves a recoverable draft
 *   4. a beforeunload prompt if a save is still in flight
 *
 * Layer 3 matters because layers 1–2 all assume the process survives long
 * enough to finish a network round trip.
 */
export function useAutosave<T>({
  value,
  onSave,
  draftKey,
  delay = 700,
  enabled = true,
}: {
  value: T;
  onSave: (value: T) => Promise<unknown>;
  /** localStorage key for the crash-recovery mirror. */
  draftKey: string;
  delay?: number;
  enabled?: boolean;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<T>(value);
  const latest = useRef<T>(value);
  const inFlight = useRef(false);
  const onSaveRef = useRef(onSave);

  latest.current = value;
  onSaveRef.current = onSave;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const pending = latest.current;
    if (!enabled || Object.is(pending, lastSaved.current) || inFlight.current) return;

    inFlight.current = true;
    setState("saving");
    try {
      await onSaveRef.current(pending);
      lastSaved.current = pending;
      setState("saved");
      // Only clear the crash draft once the server has it.
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* private mode / quota — the save already succeeded, so this is fine */
      }
    } catch {
      setState("error");
    } finally {
      inFlight.current = false;
    }
  }, [draftKey, enabled]);

  // Mirror every keystroke locally, then schedule the real save.
  useEffect(() => {
    if (!enabled) return;
    if (Object.is(value, lastSaved.current)) return;

    setState("dirty");
    try {
      localStorage.setItem(draftKey, JSON.stringify({ value, at: Date.now() }));
    } catch {
      /* best effort */
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, draftKey, enabled, flush]);

  // Save when the tab is hidden — on mobile and on laptop-close this fires
  // where 'beforeunload' often doesn't.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  // Last-ditch warning if the user closes mid-save.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.is(latest.current, lastSaved.current)) return;
      void flush();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  // Navigating away within the SPA still has to persist.
  useEffect(() => () => void flush(), [flush]);

  /** Adopt server state as the baseline, e.g. right after loading a note. */
  const reset = useCallback((serverValue: T) => {
    lastSaved.current = serverValue;
    latest.current = serverValue;
    setState("idle");
  }, []);

  return { state, flush, reset };
}

/** A newer local draft than the server copy means the last session was cut short. */
export function readDraft<T>(draftKey: string): { value: T; at: number } | null {
  try {
    const raw = localStorage.getItem(draftKey);
    return raw ? (JSON.parse(raw) as { value: T; at: number }) : null;
  } catch {
    return null;
  }
}

export function clearDraft(draftKey: string): void {
  try {
    localStorage.removeItem(draftKey);
  } catch {
    /* best effort */
  }
}
