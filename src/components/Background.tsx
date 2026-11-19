"use client";

import { useEffect } from "react";

export type ClientError = { at: number; message: string; where: string };

// Kept in memory for this tab, so the Dev tools page can show browser-side errors too.
const g = globalThis as unknown as { imbalanceClientErrors?: ClientError[] };
export const clientErrors = () => (g.imbalanceClientErrors ??= []);

function record(where: string, message: string) {
  const list = clientErrors();
  list.push({ at: Date.now(), where, message: message.slice(0, 2000) });
  if (list.length > 50) list.splice(0, list.length - 50);
}

/**
 * Invisible helpers mounted once in the layout: records browser errors for the Dev tools
 * page, and updates prices by itself when the user turned on auto update in Settings.
 */
export function Background() {
  useEffect(() => {
    const onError = (e: ErrorEvent) =>
      record("window", `${e.message} at ${e.filename}:${e.lineno}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      record(
        "promise",
        e.reason instanceof Error
          ? `${e.reason.message}\n${e.reason.stack ?? ""}`
          : String(e.reason),
      );
    // Console errors include React's warnings, like the style one from before.
    const original = console.error;
    console.error = (...args: unknown[]) => {
      record(
        "console",
        args
          .map((a) => (a instanceof Error ? (a.stack ?? a.message) : String(a)))
          .join(" "),
      );
      original(...args);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      console.error = original;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    let busy = false;
    async function tick() {
      if (busy) return;
      busy = true;
      try {
        const s = (await (await fetch("/api/status")).json()) as {
          pricesSyncedAt: number | null;
          pricesCooldownMs: number;
          limits: { autoUpdateMinutes: number };
        };
        const every = s.limits.autoUpdateMinutes * 60_000;
        const due =
          every > 0 &&
          s.pricesCooldownMs === 0 &&
          Date.now() - (s.pricesSyncedAt ?? 0) >= every;
        if (due) await fetch("/api/sync/prices", { method: "POST" });
      } catch {
        // The app may be restarting; try again next minute.
      } finally {
        busy = false;
      }
    }
    const id = setInterval(() => void tick(), 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
