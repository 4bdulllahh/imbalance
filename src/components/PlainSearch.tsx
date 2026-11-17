"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Plain English to page filters, e.g. "purple trade-ups under 20". Needs an AI key. */
export function PlainSearch() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "filters", question: text }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No answer.");
      router.push(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No answer.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <form onSubmit={(e) => void go(e)} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="plain-search">
          Describe what to find
        </label>
        <input
          id="plain-search"
          className="input min-w-0 flex-1"
          required
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. purple StatTrak trade-ups under 20, or AK deals that dipped"
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Finding..." : "Find"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
