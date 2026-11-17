import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { getMeta, setMeta, transaction } from "../db";
import { fetchJson } from "../http";
import { toCents } from "../wear";

// Public, no key. Skinport caches these for 5 minutes and allows about 8 requests per 5 minutes.
const BASE = "https://api.skinport.com/v1";
const QUERY = "app_id=730&currency=USD";
const HEADERS = { "Accept-Encoding": "br" }; // required by Skinport
export const SOURCE = "skinport";
export const SYNC_COOLDOWN_MS = 5 * 60_000;
// shortcut: snapshots grow forever (~15k rows each), prune old ones when charts land in M11.
const SNAPSHOT_EVERY_MS = 6 * 60 * 60_000;
// Stickers, charms and the like are never trade-up inputs, so they get no history.
const NO_SNAPSHOT =
  /^(Sticker|Patch|Sealed Graffiti|Charm|Music Kit|Souvenir Charm)/;

const price = z.number().nullish();

export const itemsSchema = z.array(
  z.object({
    market_hash_name: z.string(),
    version: z.string().nullish(),
    suggested_price: price,
    min_price: price,
    median_price: price,
    quantity: z.number().int().nonnegative(),
  }),
);

const window = z.object({
  median: price,
  volume: z.number().int().nonnegative(),
});
export const historySchema = z.array(
  z.object({
    market_hash_name: z.string(),
    version: z.string().nullish(),
    last_24_hours: window,
    last_7_days: window,
    last_30_days: window,
    last_90_days: window,
  }),
);

export type SkinportData = {
  items: z.infer<typeof itemsSchema>;
  history: z.infer<typeof historySchema>;
};

export async function fetchSkinport(): Promise<SkinportData> {
  const [items, history] = await Promise.all([
    fetchJson(`${BASE}/items?${QUERY}`, itemsSchema, { headers: HEADERS }),
    fetchJson(`${BASE}/sales/history?${QUERY}`, historySchema, {
      headers: HEADERS,
    }),
  ]);
  return { items, history };
}

/** Saves latest prices and history, plus a snapshot of weapon skins every 6 hours. */
export function saveSkinport(
  db: DatabaseSync,
  data: SkinportData,
  now = Date.now(),
) {
  const takeSnapshot =
    now - Number(getMeta(db, "skinport_snapshot_at") ?? 0) >= SNAPSHOT_EVERY_MS;

  transaction(db, () => {
    const upPrice = db.prepare(
      `INSERT INTO prices (market_hash_name, source, version, min_cents, suggested_cents, median_cents, quantity, updated_at)
       VALUES (?, '${SOURCE}', ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO UPDATE SET min_cents = excluded.min_cents, suggested_cents = excluded.suggested_cents,
         median_cents = excluded.median_cents, quantity = excluded.quantity, updated_at = excluded.updated_at`,
    );
    const insSnap = db.prepare(
      `INSERT INTO price_snapshots (market_hash_name, source, version, taken_at, min_cents, quantity)
       VALUES (?, '${SOURCE}', ?, ?, ?, ?)`,
    );
    for (const i of data.items) {
      const min = toCents(i.min_price);
      upPrice.run(
        i.market_hash_name,
        i.version ?? "",
        min,
        toCents(i.suggested_price),
        toCents(i.median_price),
        i.quantity,
        now,
      );
      if (takeSnapshot && min != null && !NO_SNAPSHOT.test(i.market_hash_name))
        insSnap.run(i.market_hash_name, i.version ?? "", now, min, i.quantity);
    }

    const upHist = db.prepare(
      `INSERT INTO price_history (market_hash_name, source, version, median_24h, volume_24h, median_7d, volume_7d,
         median_30d, volume_30d, median_90d, volume_90d, updated_at)
       VALUES (?, '${SOURCE}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO UPDATE SET median_24h = excluded.median_24h, volume_24h = excluded.volume_24h,
         median_7d = excluded.median_7d, volume_7d = excluded.volume_7d, median_30d = excluded.median_30d,
         volume_30d = excluded.volume_30d, median_90d = excluded.median_90d, volume_90d = excluded.volume_90d,
         updated_at = excluded.updated_at`,
    );
    for (const h of data.history) {
      const w = [
        h.last_24_hours,
        h.last_7_days,
        h.last_30_days,
        h.last_90_days,
      ];
      upHist.run(
        h.market_hash_name,
        h.version ?? "",
        ...w.flatMap((x) => [toCents(x.median), x.volume]),
        now,
      );
    }

    setMeta(db, "skinport_synced_at", String(now));
    if (takeSnapshot) setMeta(db, "skinport_snapshot_at", String(now));
  });

  return {
    items: data.items.length,
    history: data.history.length,
    snapshot: takeSnapshot,
  };
}
