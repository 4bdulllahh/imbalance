import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "../db";
import { fetchJson } from "../http";

const BASE = "https://csfloat.com/api/v1";
export const SOURCE = "csfloat";
export const LISTINGS_FRESH_MS = 10 * 60_000;

const listingSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  price: z.number().int().nonnegative(), // cents
  item: z.object({
    market_hash_name: z.string(),
    float_value: z.number().min(0).max(1).nullish(),
    paint_seed: z.number().int().nullish(),
  }),
});

// shortcut: docs.csfloat.com was unreachable when this was written, so both shapes the API
// has used are accepted. Tighten once a real response is checked.
export const listingsResponseSchema = z
  .union([z.array(listingSchema), z.object({ data: z.array(listingSchema) })])
  .transform((r) => (Array.isArray(r) ? r : r.data));

export type Listing = {
  id: string;
  marketHashName: string;
  priceCents: number;
  float: number | null;
  paintSeed: number | null;
  url: string;
};

export async function fetchListings(
  apiKey: string,
  marketHashName: string,
  opts: { maxFloat?: number; limit?: number } = {},
): Promise<Listing[]> {
  const q = new URLSearchParams({
    market_hash_name: marketHashName,
    sort_by: "lowest_price",
    type: "buy_now",
    limit: String(opts.limit ?? 50),
  });
  if (opts.maxFloat != null) q.set("max_float", String(opts.maxFloat));
  const rows = await fetchJson(
    `${BASE}/listings?${q}`,
    listingsResponseSchema,
    {
      headers: { Authorization: apiKey },
    },
  );
  return rows.map((r) => ({
    id: r.id,
    marketHashName: r.item.market_hash_name,
    priceCents: r.price,
    float: r.item.float_value ?? null,
    paintSeed: r.item.paint_seed ?? null,
    url: `https://csfloat.com/item/${r.id}`,
  }));
}

/** Replaces the saved listings for one item, so sold listings disappear. */
export function saveListings(
  db: DatabaseSync,
  marketHashName: string,
  listings: Listing[],
  now = Date.now(),
) {
  transaction(db, () => {
    db.prepare(
      "DELETE FROM listings WHERE source = ? AND market_hash_name = ?",
    ).run(SOURCE, marketHashName);
    const ins = db.prepare(
      `INSERT OR REPLACE INTO listings (id, source, market_hash_name, price_cents, float_value, paint_seed, url, fetched_at)
       VALUES (?, '${SOURCE}', ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of listings)
      ins.run(
        l.id,
        l.marketHashName,
        l.priceCents,
        l.float,
        l.paintSeed,
        l.url,
        now,
      );
  });
}

export function savedListings(
  db: DatabaseSync,
  marketHashName: string,
  now = Date.now(),
) {
  const rows = db
    .prepare(
      `SELECT id, market_hash_name, price_cents, float_value, paint_seed, url, fetched_at
       FROM listings WHERE source = ? AND market_hash_name = ? ORDER BY price_cents`,
    )
    .all(SOURCE, marketHashName) as {
    id: string;
    market_hash_name: string;
    price_cents: number;
    float_value: number | null;
    paint_seed: number | null;
    url: string;
    fetched_at: number;
  }[];
  const fresh = rows.length > 0 && now - rows[0].fetched_at < LISTINGS_FRESH_MS;
  const listings: Listing[] = rows.map((r) => ({
    id: r.id,
    marketHashName: r.market_hash_name,
    priceCents: r.price_cents,
    float: r.float_value,
    paintSeed: r.paint_seed,
    url: r.url,
  }));
  return { fresh, listings };
}
