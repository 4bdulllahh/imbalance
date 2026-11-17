import type { DatabaseSync } from "node:sqlite";
import { getMeta } from "./db";

/** Milliseconds left before a sync may run again, 0 when it's allowed now. */
export function cooldownLeft(
  db: DatabaseSync,
  key: string,
  cooldownMs: number,
  now = Date.now(),
): number {
  const last = Number(getMeta(db, key) ?? 0);
  return Math.max(0, last + cooldownMs - now);
}
