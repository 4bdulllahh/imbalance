import type { DatabaseSync } from "node:sqlite";
import { getMeta } from "./db";
import { marketHashName, type WearName } from "./wear";

export type Status = {
  skins: number;
  collections: number;
  prices: number;
  snapshots: number;
  catalogSyncedAt: number | null;
  pricesSyncedAt: number | null;
};

export function getStatus(db: DatabaseSync): Status {
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
  const time = (key: string) =>
    getMeta(db, key) ? Number(getMeta(db, key)) : null;
  return {
    skins: count("skins"),
    collections: count("collections"),
    prices: count("prices"),
    snapshots: count("price_snapshots"),
    catalogSyncedAt: time("catalog_synced_at"),
    pricesSyncedAt: time("skinport_synced_at"),
  };
}

type SkinRow = {
  id: string;
  name: string;
  weapon: string | null;
  rarity_name: string;
  rarity_color: string | null;
  min_float: number | null;
  max_float: number | null;
  stattrak: number;
  souvenir: number;
  image: string | null;
  wears: string;
  collections: string | null;
};

export type SkinSummary = {
  id: string;
  name: string;
  weapon: string | null;
  rarity: string;
  rarityColor: string | null;
  minFloat: number | null;
  maxFloat: number | null;
  stattrak: boolean;
  souvenir: boolean;
  image: string | null;
  wears: WearName[];
  collections: string[];
  fromCents: number | null;
};

export const PAGE_SIZE = 48;

/** Catalog search with the cheapest Skinport price across the skin's normal wears. */
export function searchSkins(
  db: DatabaseSync,
  opts: { q?: string; rarity?: string; page?: number },
) {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.q) {
    where.push("(s.name LIKE ? OR c.name LIKE ?)");
    args.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.rarity) {
    where.push("s.rarity_name = ?");
    args.push(opts.rarity);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const from = `FROM skins s
    LEFT JOIN skin_collections sc ON sc.skin_id = s.id
    LEFT JOIN collections c ON c.id = sc.collection_id ${whereSql}`;

  const total = (
    db.prepare(`SELECT COUNT(DISTINCT s.id) n ${from}`).get(...args) as {
      n: number;
    }
  ).n;
  const page = Math.max(1, opts.page ?? 1);
  const rows = db
    .prepare(
      `SELECT s.*, GROUP_CONCAT(c.name, '|') AS collections ${from}
       GROUP BY s.id ORDER BY s.name LIMIT ? OFFSET ?`,
    )
    .all(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE) as SkinRow[];

  const priceOf = db.prepare(
    "SELECT MIN(min_cents) AS cents FROM prices WHERE source = 'skinport' AND market_hash_name = ?",
  );
  const skins: SkinSummary[] = rows.map((r) => {
    const wears = JSON.parse(r.wears) as WearName[];
    const names = wears.length
      ? wears.map((w) => marketHashName(r.name, w))
      : [marketHashName(r.name, null)];
    const prices = names
      .map((n) => (priceOf.get(n) as { cents: number | null }).cents)
      .filter((c): c is number => c != null);
    return {
      id: r.id,
      name: r.name,
      weapon: r.weapon,
      rarity: r.rarity_name,
      rarityColor: r.rarity_color,
      minFloat: r.min_float,
      maxFloat: r.max_float,
      stattrak: r.stattrak === 1,
      souvenir: r.souvenir === 1,
      image: r.image,
      wears,
      collections: r.collections ? [...new Set(r.collections.split("|"))] : [],
      fromCents: prices.length ? Math.min(...prices) : null,
    };
  });
  return { total, page, pageSize: PAGE_SIZE, skins };
}

export type WearPrice = {
  wear: WearName | null;
  variant: "normal" | "stattrak" | "souvenir";
  marketHashName: string;
  minCents: number | null;
  medianCents: number | null;
  quantity: number;
  median7d: number | null;
  median30d: number | null;
  volume7d: number;
};

/** Every wear and variant of one skin, with Skinport price and history. */
export function skinDetail(db: DatabaseSync, id: string) {
  const summary = searchSkinsById(db, id);
  if (!summary) return null;
  const variants = [
    "normal",
    ...(summary.stattrak ? ["stattrak"] : []),
    ...(summary.souvenir ? ["souvenir"] : []),
  ] as WearPrice["variant"][];
  const wears: (WearName | null)[] = summary.wears.length
    ? summary.wears
    : [null];
  const row = db.prepare(
    `SELECT p.min_cents, p.median_cents, p.quantity, h.median_7d, h.median_30d, h.volume_7d
     FROM prices p LEFT JOIN price_history h
       ON h.market_hash_name = p.market_hash_name AND h.source = p.source AND h.version = p.version
     WHERE p.source = 'skinport' AND p.market_hash_name = ? ORDER BY p.min_cents LIMIT 1`,
  );
  const prices: WearPrice[] = variants.flatMap((variant) =>
    wears.map((wear) => {
      const name = marketHashName(summary.name, wear, variant);
      const r = row.get(name) as
        | {
            min_cents: number | null;
            median_cents: number | null;
            quantity: number;
            median_7d: number | null;
            median_30d: number | null;
            volume_7d: number | null;
          }
        | undefined;
      return {
        wear,
        variant,
        marketHashName: name,
        minCents: r?.min_cents ?? null,
        medianCents: r?.median_cents ?? null,
        quantity: r?.quantity ?? 0,
        median7d: r?.median_7d ?? null,
        median30d: r?.median_30d ?? null,
        volume7d: r?.volume_7d ?? 0,
      };
    }),
  );
  return { skin: summary, prices };
}

function searchSkinsById(
  db: DatabaseSync,
  id: string,
): SkinSummary | undefined {
  const r = db.prepare("SELECT name FROM skins WHERE id = ?").get(id) as
    { name: string } | undefined;
  if (!r) return undefined;
  return searchSkins(db, { q: r.name }).skins.find((s) => s.id === id);
}
