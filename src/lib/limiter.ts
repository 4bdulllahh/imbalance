import { z } from "zod";

/**
 * How often Imbalance may call each outside API. The user sets these on the Settings page;
 * the floors keep friends from getting their IP blocked by turning them too low.
 */
export const limitsSchema = z.object({
  /** Skinport allows about 8 calls per 5 minutes; a price update is 2 calls. */
  skinportMinutes: z.number().int().min(5).max(1440).default(5),
  /** Update prices by itself while the app is open. 0 = off. */
  autoUpdateMinutes: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .refine((v) => v === 0 || v >= 5, "Auto update needs 0 (off) or 5+ minutes")
    .default(0),
  csfloatSeconds: z.number().min(1).max(120).default(2),
  /** Steam allows roughly 20 calls a minute. */
  steamSeconds: z.number().min(3).max(120).default(3),
  aiSeconds: z.number().min(1).max(120).default(2),
});
export type ApiLimits = z.infer<typeof limitsSchema>;
export const DEFAULT_LIMITS: ApiLimits = limitsSchema.parse({});

/** Reads saved limits, falling back to the defaults for anything missing or invalid. */
export function parseLimits(json: string | undefined): ApiLimits {
  try {
    const r = limitsSchema.safeParse(JSON.parse(json ?? "{}"));
    return r.success ? r.data : DEFAULT_LIMITS;
  } catch {
    return DEFAULT_LIMITS;
  }
}

type State = {
  limits: ApiLimits;
  next: Map<string, number>;
  log: RequestLog[];
  errors: ErrorLog[];
};
// On globalThis so dev hot reloads keep one limiter and one log.
const g = globalThis as unknown as { imbalanceLimiter?: State };
const state = (g.imbalanceLimiter ??= {
  limits: DEFAULT_LIMITS,
  next: new Map(),
  log: [],
  errors: [],
});

export const currentLimits = () => state.limits;
export function applyLimits(l: ApiLimits) {
  state.limits = l;
}

/** Seconds to wait between calls to a host, 0 for hosts without a limit. */
export function gapMs(host: string, l = state.limits): number {
  if (host.endsWith("csfloat.com")) return l.csfloatSeconds * 1000;
  if (host.endsWith("steamcommunity.com")) return l.steamSeconds * 1000;
  if (/googleapis|groq|openrouter/.test(host)) return l.aiSeconds * 1000;
  return 0;
}

/** Longest a request waits in line before giving up with a plain-English error. */
const MAX_WAIT_MS = 20_000;

/**
 * Waits for this host's turn. Each call books the next free slot first, so calls made at
 * the same time queue up instead of all going at once.
 */
export async function throttle(host: string, now = Date.now()): Promise<void> {
  const gap = gapMs(host);
  if (!gap) return;
  const at = Math.max(now, state.next.get(host) ?? 0);
  if (at - now > MAX_WAIT_MS)
    throw new Error(
      `Waiting for ${host}: your limit is one call every ${gap / 1000} s and the queue is full. Try again in ${Math.ceil((at - now) / 1000)} s, or lower the limit in Settings.`,
    );
  state.next.set(host, at + gap);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

export type RequestLog = {
  at: number;
  host: string;
  path: string;
  status: number | null;
  ms: number;
  error?: string;
};
export type ErrorLog = { at: number; where: string; message: string };

const KEEP = 100;
const push = <T>(list: T[], item: T) => {
  list.push(item);
  if (list.length > KEEP) list.splice(0, list.length - KEEP);
};

export const logRequest = (r: RequestLog) => push(state.log, r);
export const logError = (where: string, err: unknown) =>
  push(state.errors, {
    at: Date.now(),
    where,
    message:
      err instanceof Error
        ? `${err.message}${err.cause instanceof Error ? ` (cause: ${err.cause.message})` : ""}`
        : String(err),
  });
export const recentRequests = () => [...state.log].reverse();
export const recentErrors = () => [...state.errors].reverse();
export function clearLogs() {
  state.log.length = 0;
  state.errors.length = 0;
}
