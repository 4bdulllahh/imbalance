"use client";

import { useState } from "react";

type Answer = { text: string; provider: string; model: string };

/**
 * Asks the user's own AI key to comment on numbers the app already computed. The AI never
 * does the maths (see SYSTEM_PROMPT in src/lib/ai.ts).
 */
export function AskAi({
  topic,
  data,
  placeholder,
  needsQuestion = false,
}: {
  topic: "contract" | "deal" | "question";
  data?: unknown;
  placeholder?: string;
  needsQuestion?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, question, data }),
      });
      const json = (await res.json()) as Answer & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "The AI didn't answer.");
      setAnswer(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The AI didn't answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <form onSubmit={(e) => void ask(e)} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`ai-${topic}`}>
          Question for the AI
        </label>
        <input
          id={`ai-${topic}`}
          className="input min-w-0 flex-1"
          required={needsQuestion}
          maxLength={1000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder ?? "Optional: ask something specific"}
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Thinking..." : "Ask AI"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
      {answer && (
        <div className="panel p-3" aria-live="polite">
          <p className="whitespace-pre-wrap">{answer.text}</p>
          <p className="mt-2 text-xs text-muted">
            {answer.provider} ({answer.model}). The AI only comments: every
            number comes from Imbalance. It can still be wrong, so check before
            you spend.
          </p>
        </div>
      )}
    </div>
  );
}
