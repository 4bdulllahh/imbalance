import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getKey, keyStatus, saveKeys } from "./keys";

const dirs: string[] = [];
function tempEnv(content?: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "imbalance-"));
  dirs.push(dir);
  const file = path.join(dir, ".env.local");
  if (content !== undefined) writeFileSync(file, content);
  return file;
}
afterEach(() =>
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })),
);

describe("keys", () => {
  it("ignores stale process.env and falls back to .env", () => {
    const file = tempEnv("");
    process.env.GROQ_API_KEY = "stale-from-next";
    expect(getKey("GROQ_API_KEY", file)).toBeUndefined();
    delete process.env.GROQ_API_KEY;
    writeFileSync(
      path.join(path.dirname(file), ".env"),
      "GROQ_API_KEY=fromdotenv1\n",
    );
    expect(getKey("GROQ_API_KEY", file)).toBe("fromdotenv1");
  });

  it("creates the file and reads keys back", () => {
    const file = tempEnv();
    saveKeys({ CSFLOAT_API_KEY: "  abcdefgh1234  " }, file);
    expect(getKey("CSFLOAT_API_KEY", file)).toBe("abcdefgh1234");
    expect(keyStatus(file)).toMatchObject({
      CSFLOAT_API_KEY: true,
      GEMINI_API_KEY: false,
    });
  });

  it("keeps other lines, replaces existing keys and removes empty ones", () => {
    const file = tempEnv(
      '# my notes\nOTHER=1\nGEMINI_API_KEY=oldoldold1\r\nGROQ_API_KEY="quoted12345"\n',
    );
    expect(getKey("GROQ_API_KEY", file)).toBe("quoted12345");
    saveKeys({ GEMINI_API_KEY: "newnewnew1", GROQ_API_KEY: "" }, file);
    expect(readFileSync(file, "utf8")).toBe(
      "# my notes\nOTHER=1\nGEMINI_API_KEY=newnewnew1\n",
    );
  });

  it("rejects unknown keys and values that could break the file", () => {
    const file = tempEnv();
    expect(() => saveKeys({ PATH: "abcdefgh" }, file)).toThrow(/Unknown/);
    expect(() => saveKeys({ GEMINI_API_KEY: "abc\nEVIL=1" }, file)).toThrow(
      /doesn't look like/,
    );
    expect(() =>
      saveKeys({ GEMINI_API_KEY: "has spaces in it" }, file),
    ).toThrow(/doesn't look like/);
  });
});
