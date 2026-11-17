import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { getMeta, setMeta } from "./db";
import { fetchJson } from "./http";

// Free, no key, updated daily. Rates are "1 USD = x CUR".
const URL = "https://open.er-api.com/v6/latest/USD";
export const RATES_MAX_AGE_MS = 24 * 60 * 60_000;

const ratesSchema = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  rates: z.record(z.string().regex(/^[A-Z]{3}$/), z.number().positive()),
});

export type Rates = { updatedAt: number; rates: Record<string, number> };

export function savedRates(db: DatabaseSync): Rates | null {
  const raw = getMeta(db, "fx_rates");
  return raw ? (JSON.parse(raw) as Rates) : null;
}

/** Saved rates, refreshed when older than a day. Falls back to old rates if the API is down. */
export async function getRates(
  db: DatabaseSync,
  now = Date.now(),
): Promise<Rates> {
  const saved = savedRates(db);
  if (saved && now - saved.updatedAt < RATES_MAX_AGE_MS) return saved;
  try {
    const { rates } = await fetchJson(URL, ratesSchema);
    const fresh: Rates = { updatedAt: now, rates: { ...rates, USD: 1 } };
    setMeta(db, "fx_rates", JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    if (saved) return saved;
    console.error(err);
    return { updatedAt: 0, rates: { USD: 1 } };
  }
}

/**
 * Formats USD cents in another currency. Conversion happens only here, for display:
 * everything stored and calculated stays in USD cents.
 */
export function formatIn(
  usdCents: number | null | undefined,
  currency: string,
  rate: number,
): string {
  if (usdCents == null) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format((usdCents / 100) * rate);
  } catch {
    return `${((usdCents / 100) * rate).toFixed(2)} ${currency}`;
  }
}
