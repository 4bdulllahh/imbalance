"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiLimits } from "@/lib/limiter";
import { Field } from "./ui";

const FIELDS: {
  key: keyof ApiLimits;
  label: string;
  unit: string;
  min: number;
  help: string;
}[] = [
  {
    key: "skinportMinutes",
    label: "Skinport price update",
    unit: "minutes between updates",
    min: 5,
    help: "Skinport allows about 8 calls per 5 minutes and an update uses 2. Below 5 minutes your IP can get blocked, so 5 is the lowest.",
  },
  {
    key: "autoUpdateMinutes",
    label: "Auto update prices",
    unit: "minutes (0 = off)",
    min: 0,
    help: "While Imbalance is open in a tab, update prices by itself this often. 0 turns it off; otherwise 5 or more.",
  },
  {
    key: "csfloatSeconds",
    label: "CSFloat",
    unit: "seconds between calls",
    min: 1,
    help: "Used for price charts and listings with floats. Calls wait their turn instead of failing.",
  },
  {
    key: "steamSeconds",
    label: "Steam Market",
    unit: "seconds between calls",
    min: 3,
    help: "Steam allows roughly 20 calls a minute. Lower than 3 seconds gets you blocked for a while.",
  },
  {
    key: "aiSeconds",
    label: "AI (Gemini, Groq, OpenRouter)",
    unit: "seconds between calls",
    min: 1,
    help: "Free AI keys have per-minute limits. Raise this if you see 'too many requests'.",
  },
];

export function Settings() {
  const [limits, setLimits] = useState<Record<keyof ApiLimits, string> | null>(
    null,
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/limits")
      .then((r) => r.json() as Promise<ApiLimits>)
      .then((l) =>
        setLimits(
          Object.fromEntries(
            Object.entries(l).map(([k, v]) => [k, String(v)]),
          ) as Record<keyof ApiLimits, string>,
        ),
      )
      .catch(() => setMsg({ ok: false, text: "Could not load settings." }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!limits) return;
    setMsg(null);
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(
          Object.entries(limits).map(([k, v]) => [k, Number(v)]),
        ),
      ),
    });
    const json = (await res.json()) as { error?: string };
    setMsg(
      res.ok
        ? { ok: true, text: "Saved. New limits apply right away." }
        : { ok: false, text: json.error ?? "Could not save." },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">
          Trade hold and the market you sell on are on the{" "}
          <Link href="/tracker" className="underline">
            Tracker
          </Link>{" "}
          page. API keys are under API keys in the header.
        </p>
      </div>

      <form className="panel space-y-4 p-4" onSubmit={(e) => void save(e)}>
        <div>
          <h2 className="font-semibold">API limits</h2>
          <p className="text-sm text-muted">
            How often Imbalance may call each free API. Calls that come too soon
            wait in line, so nothing breaks, it only gets slower. The lowest
            values are the safe minimums.
          </p>
        </div>
        {!limits ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="rounded-lg border border-line p-3">
                <Field label={`${f.label} (${f.unit})`}>
                  <input
                    className="input w-32"
                    type="number"
                    min={f.min}
                    step="1"
                    value={limits[f.key]}
                    onChange={(e) =>
                      setLimits({ ...limits, [f.key]: e.target.value })
                    }
                  />
                </Field>
                <p className="mt-1 text-xs text-muted">{f.help}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={!limits}>
            Save limits
          </button>
          {msg && (
            <span
              role="status"
              className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>

      <div className="panel p-4">
        <h2 className="font-semibold">Troubleshooting</h2>
        <p className="mt-1 text-sm text-muted">
          Something not working? The Dev tools page shows recent errors, every
          call to an outside API, and the database state, with one button to
          copy it all for Claude.
        </p>
        <Link href="/debug" className="btn mt-3 inline-block">
          Open Dev tools
        </Link>
      </div>
    </div>
  );
}
