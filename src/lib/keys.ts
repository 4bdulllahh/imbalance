import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export type KeyId =
  "CSFLOAT_API_KEY" | "GEMINI_API_KEY" | "OPENROUTER_API_KEY" | "GROQ_API_KEY";

export type KeyDef = {
  id: KeyId;
  label: string;
  unlocks: string;
  group: "market" | "ai";
  signupUrl: string;
  steps: string[];
  videoSearch: string;
};

// Every key is free and optional. AI keys: any one is enough.
export const KEY_DEFS: KeyDef[] = [
  {
    id: "CSFLOAT_API_KEY",
    label: "CSFloat",
    unlocks:
      "Real listings with exact floats, so Imbalance can find low-float skins to buy.",
    group: "market",
    signupUrl: "https://csfloat.com/profile",
    steps: [
      "Go to csfloat.com and sign in with Steam.",
      "Open your profile and pick the Developers tab.",
      "Click New Key, give it any name, and copy the key.",
    ],
    videoSearch: "how to get csfloat api key",
  },
  {
    id: "GEMINI_API_KEY",
    label: "Google Gemini",
    unlocks: "The AI advisor (free tier).",
    group: "ai",
    signupUrl: "https://aistudio.google.com/apikey",
    steps: [
      "Go to aistudio.google.com/apikey and sign in with a Google account.",
      "Click Create API key.",
      "Copy the key.",
    ],
    videoSearch: "how to get gemini api key free google ai studio",
  },
  {
    id: "OPENROUTER_API_KEY",
    label: "OpenRouter",
    unlocks: "The AI advisor through OpenRouter's free models.",
    group: "ai",
    signupUrl: "https://openrouter.ai/keys",
    steps: [
      "Go to openrouter.ai and sign in.",
      "Open Keys and click Create Key.",
      "Copy the key.",
    ],
    videoSearch: "how to get openrouter api key",
  },
  {
    id: "GROQ_API_KEY",
    label: "Groq",
    unlocks: "The AI advisor through Groq's free, fast models.",
    group: "ai",
    signupUrl: "https://console.groq.com/keys",
    steps: [
      "Go to console.groq.com and sign in.",
      "Open API Keys and click Create API Key.",
      "Copy the key.",
    ],
    videoSearch: "how to get groq api key",
  },
];

const KEY_IDS = new Set<string>(KEY_DEFS.map((k) => k.id));
const VALID_VALUE = /^[\x21-\x7e]{8,300}$/; // printable, no spaces or newlines

export const envFile = () =>
  process.env.IMBALANCE_ENV_FILE ?? path.join(process.cwd(), ".env.local");

function readEnvFile(file: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(/*turbopackIgnore: true*/ file)) return map;
  for (const line of readFileSync(/*turbopackIgnore: true*/ file, "utf8").split(
    /\r?\n/,
  )) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) map.set(m[1], m[2].replace(/^(["'])(.*)\1$/, "$2"));
  }
  return map;
}

/**
 * Reads a key from .env.local (then .env) on every call, so keys saved from the popup work
 * without a restart. process.env is skipped on purpose: Next copies .env.local into it and
 * keeps removed keys there, so it goes stale.
 */
export function getKey(id: KeyId, file = envFile()): string | undefined {
  return (
    readEnvFile(file).get(id) ||
    readEnvFile(path.join(path.dirname(file), ".env")).get(id) ||
    undefined
  );
}

export function keyStatus(file = envFile()): Record<KeyId, boolean> {
  return Object.fromEntries(
    KEY_DEFS.map((k) => [k.id, Boolean(getKey(k.id, file))]),
  ) as Record<KeyId, boolean>;
}

/**
 * Saves keys to .env.local, keeping every other line. An empty value removes the key.
 * Writes a temp file and renames it so a crash can't leave a half-written file.
 */
export function saveKeys(
  updates: Record<string, unknown>,
  file = envFile(),
): void {
  const clean = new Map<string, string>();
  for (const [id, raw] of Object.entries(updates)) {
    if (!KEY_IDS.has(id)) throw new Error(`Unknown key: ${id}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value && !VALID_VALUE.test(value)) {
      throw new Error(
        `That ${id} doesn't look like an API key. Paste it again without spaces.`,
      );
    }
    clean.set(id, value);
  }

  const lines = existsSync(/*turbopackIgnore: true*/ file)
    ? readFileSync(/*turbopackIgnore: true*/ file, "utf8").split(/\r?\n/)
    : [];
  const out: string[] = [];
  for (const line of lines) {
    const id = /^\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1];
    if (id && clean.has(id)) {
      const value = clean.get(id)!;
      if (value) out.push(`${id}=${value}`);
      clean.delete(id);
    } else {
      out.push(line);
    }
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  for (const [id, value] of clean) if (value) out.push(`${id}=${value}`);

  const tmp = `${file}.tmp`;
  writeFileSync(/*turbopackIgnore: true*/ tmp, out.join("\n") + "\n", "utf8");
  renameSync(/*turbopackIgnore: true*/ tmp, file);
}
