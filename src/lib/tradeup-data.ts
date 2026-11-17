import type { DatabaseSync } from "node:sqlite";
import type { InputOption } from "./finder";
import { nextTier, type OutcomeSkin, type PriceFn, type Tier } from "./tradeup";
import { marketHashName, WEARS, type WearName } from "./wear";

export type Variant = "normal" | "stattrak";

type PriceRow = {
  market_hash_name: string;
  version: string;
  min_cents: number | null;
  quantity: number;
  median_7d: number | null;
  volume_7d: number | null;
};

/** Skinport prices keyed by "name|version". */
function loadPrices(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT p.market_hash_name, p.version, p.min_cents, p.quantity, h.median_7d, h.volume_7d
       FROM prices p LEFT JOIN price_history h
         ON h.market_hash_name = p.market_hash_name AND h.source = p.source AND h.version = p.version
       WHERE p.source = 'skinport'`,
    )
    .all() as PriceRow[];
  return new Map(rows.map((r) => [`${r.market_hash_name}|${r.version}`, r]));
}

/**
 * What a skin really sells for: the 7-day median sale when it trades often enough,
 * otherwise the lowest listing. Sales are a truer price than hopeful listings.
 */
export function sellPrice(r: PriceRow | undefined): number | null {
  if (!r) return null;
  if (r.median_7d != null && (r.volume_7d ?? 0) >= 3) return r.median_7d;
  return r.min_cents;
}

type SkinRow = {
  id: string;
  name: string;
  image: string | null;
  min_float: number | null;
  max_float: number | null;
  wears: string;
  collection_id: string;
};

/** Everything the finder needs for one tier: input options, outcome pools and a price lookup. */
export function loadTierData(db: DatabaseSync, tier: Tier, variant: Variant) {
  const prices = loadPrices(db);
  const st = variant === "stattrak" ? " AND s.stattrak = 1" : "";
  const next = nextTier(tier);

  const outcomes = new Map<string, OutcomeSkin[]>();
  const addOutcome = (o: OutcomeSkin) => {
    const list = outcomes.get(o.collectionId) ?? [];
    list.push(o);
    outcomes.set(o.collectionId, list);
  };
  if (next === "Rare") {
    const rows = db
      .prepare(
        `SELECT r.collection_id, r.skin_id, r.name, r.phase, COALESCE(r.image, s.image) image,
                s.min_float, s.max_float, s.wears
         FROM rare_pool r LEFT JOIN skins s ON s.id = r.skin_id`,
      )
      .all() as {
      collection_id: string;
      skin_id: string;
      name: string;
      phase: string;
      image: string | null;
      min_float: number | null;
      max_float: number | null;
      wears: string | null;
    }[];
    for (const r of rows) {
      const hasWear = r.wears != null && JSON.parse(r.wears).length > 0;
      addOutcome({
        id: r.phase ? `${r.skin_id}|${r.phase}` : r.skin_id,
        name: r.name,
        collectionId: r.collection_id,
        minFloat: r.min_float ?? 0,
        maxFloat: r.max_float ?? 1,
        hasWear,
        phase: r.phase || undefined,
        image: r.image,
      });
    }
  } else {
    const rows = db
      .prepare(
        `SELECT s.id, s.name, s.image, s.min_float, s.max_float, s.wears, sc.collection_id
         FROM skins s JOIN skin_collections sc ON sc.skin_id = s.id
         WHERE s.rarity_name = ?${st}`,
      )
      .all(next) as SkinRow[];
    for (const r of rows) {
      addOutcome({
        id: r.id,
        name: r.name,
        collectionId: r.collection_id,
        minFloat: r.min_float ?? 0,
        maxFloat: r.max_float ?? 1,
        hasWear: JSON.parse(r.wears).length > 0,
        image: r.image,
      });
    }
  }

  const priceRow = (skin: OutcomeSkin, wear: WearName | null) =>
    prices.get(
      `${marketHashName(skin.name, wear, variant)}|${skin.phase ?? ""}`,
    );
  const price: PriceFn = (skin, wear) => sellPrice(priceRow(skin, wear));
  /** Sales in the last 7 days: low numbers mean the price may be fake or hard to sell at. */
  const volume7d = (skin: OutcomeSkin, wear: WearName | null) =>
    priceRow(skin, wear)?.volume_7d ?? 0;

  const inputRows = db
    .prepare(
      `SELECT s.id, s.name, s.image, s.min_float, s.max_float, s.wears, sc.collection_id
       FROM skins s JOIN skin_collections sc ON sc.skin_id = s.id
       WHERE s.rarity_name = ?${st}`,
    )
    .all(tier) as SkinRow[];
  const options: InputOption[] = [];
  for (const r of inputRows) {
    if (
      !outcomes.has(r.collection_id) ||
      r.min_float == null ||
      r.max_float == null
    )
      continue;
    for (const wear of JSON.parse(r.wears) as WearName[]) {
      const name = marketHashName(r.name, wear, variant);
      const p = prices.get(`${name}|`);
      if (!p || p.min_cents == null || p.quantity === 0) continue;
      const w = WEARS.findIndex((x) => x.name === wear);
      // Worst float inside this wear for this skin (wear upper bounds are exclusive).
      const worst = Math.min(r.max_float, WEARS[w].max - 1e-6);
      options.push({
        skinId: r.id,
        skinName: r.name,
        image: r.image,
        collectionId: r.collection_id,
        wear,
        marketHashName: name,
        float: Math.max(r.min_float, worst),
        minFloat: r.min_float,
        maxFloat: r.max_float,
        costCents: p.min_cents,
        quantity: p.quantity,
      });
    }
  }

  return {
    options: cheapestPerCollectionWear(options),
    outcomes,
    price,
    volume7d,
  };
}

/** Keeps only the cheapest skin per collection and wear: the others never win. */
function cheapestPerCollectionWear(options: InputOption[]): InputOption[] {
  const best = new Map<string, InputOption>();
  for (const o of options) {
    const k = `${o.collectionId}|${o.wear}`;
    const cur = best.get(k);
    if (!cur || o.costCents < cur.costCents) best.set(k, o);
  }
  return [...best.values()];
}
