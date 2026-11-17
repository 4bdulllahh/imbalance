import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { fetchJson } from "../http";

// Public, no key, one item per call. Steam allows roughly 20 calls a minute, so this only
// runs when the user asks for one item, and answers are reused for 10 minutes.
const URL =
  "https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=";
export const SOURCE = "steam";
const FRESH_MS = 10 * 60_000;

const money = z
  .string()
  .regex(/^\$[\d,]+\.\d{2}$/)
  .transform((s) => Math.round(Number(s.replace(/[$,]/g, "")) * 100));

export const overviewSchema = z.object({
  success: z.literal(true),
  lowest_price: money.optional(),
  median_price: money.optional(),
  volume: z
    .string()
    .transform((s) => Number(s.replace(/,/g, "")))
    .optional(),
});

export type SteamPrice = {
  lowestCents: number | null;
  medianCents: number | null;
  volume24h: number;
  updatedAt: number;
};

export async function steamPrice(
  db: DatabaseSync,
  marketHashName: string,
  now = Date.now(),
): Promise<SteamPrice> {
  const saved = db
    .prepare(
      "SELECT min_cents, median_cents, quantity, updated_at FROM prices WHERE source = ? AND market_hash_name = ? AND version = ''",
    )
    .get(SOURCE, marketHashName) as
    | {
        min_cents: number | null;
        median_cents: number | null;
        quantity: number;
        updated_at: number;
      }
    | undefined;
  if (saved && now - saved.updated_at < FRESH_MS) {
    return {
      lowestCents: saved.min_cents,
      medianCents: saved.median_cents,
      volume24h: saved.quantity,
      updatedAt: saved.updated_at,
    };
  }
  const r = await fetchJson(
    URL + encodeURIComponent(marketHashName),
    overviewSchema,
    {},
    15_000,
  );
  const price: SteamPrice = {
    lowestCents: r.lowest_price ?? null,
    medianCents: r.median_price ?? null,
    volume24h: r.volume ?? 0,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO prices (market_hash_name, source, version, min_cents, median_cents, quantity, updated_at)
     VALUES (?, ?, '', ?, ?, ?, ?)
     ON CONFLICT DO UPDATE SET min_cents = excluded.min_cents, median_cents = excluded.median_cents,
       quantity = excluded.quantity, updated_at = excluded.updated_at`,
  ).run(
    marketHashName,
    SOURCE,
    price.lowestCents,
    price.medianCents,
    price.volume24h,
    now,
  );
  return price;
}
