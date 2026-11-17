import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanReply, pickModel, pickProvider } from "./ai";

describe("ai", () => {
  it("picks a fast general Gemini model, skipping lite, preview and non-chat ones", () => {
    const ids = [
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash-preview-tts",
      "text-embedding-004",
    ];
    expect(pickModel("gemini", ids)).toBe("gemini-2.5-flash");
  });

  it("picks a free OpenRouter model and a Llama on Groq", () => {
    expect(
      pickModel("openrouter", [
        "openai/gpt-4o",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-8b:free",
      ]),
    ).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(pickModel("openrouter", ["openai/gpt-4o"])).toBeNull();
    expect(
      pickModel("groq", [
        "whisper-large-v3",
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
      ]),
    ).toBe("llama-3.3-70b-versatile");
  });

  it("uses the first provider with a key", () => {
    const file = join(mkdtempSync(join(tmpdir(), "imb-")), ".env.local");
    writeFileSync(
      file,
      "OPENROUTER_API_KEY=sk-or-abcdefgh\nGROQ_API_KEY=gsk_abcdefgh\n",
    );
    expect(pickProvider(file)).toEqual({ id: "groq", key: "gsk_abcdefgh" });
  });

  it("removes banned dashes", () => {
    expect(
      cleanReply(
        ` Risky ${String.fromCharCode(0x2014)} thin market${String.fromCharCode(0x2026)} `,
      ),
    ).toBe("Risky, thin market...");
  });
});
