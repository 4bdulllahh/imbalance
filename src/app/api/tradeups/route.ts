import { getSettings } from "@/lib/tracker";
import { contractTimeline } from "@/lib/timeline";
import { getDb, getMeta } from "@/lib/db";
import {
  isMarketplaceId,
  MARKETPLACE_IDS,
  MARKETPLACES,
  type MarketplaceId,
} from "@/lib/fees";
import { findContracts, type FoundContract } from "@/lib/finder";
import { isTier, nextTier } from "@/lib/tradeup";
import { loadTierData } from "@/lib/tradeup-data";
import { riskNotes } from "@/lib/risk";

// Same scan on the same prices gives the same answer: reuse it until prices or settings change.
const g = globalThis as unknown as {
  imbalanceScans?: Map<string, unknown>;
};
const scans = (g.imbalanceScans ??= new Map());

/** Scans one tier for the most profitable contracts. Takes 1 to 4 seconds, then cached. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const db = getDb();
  // Owned skins are inputs too, so what the user holds is part of the key.
  const owned = JSON.stringify(
    db
      .prepare(
        "SELECT COUNT(*) n, MAX(id) id, SUM(status = 'holding') h, SUM(tradable_at) t FROM holdings",
      )
      .get(),
  );
  const cacheKey = `${p}|${getMeta(db, "skinport_synced_at")}|${getMeta(db, "settings")}|${owned}`;
  if (scans.has(cacheKey)) return Response.json(scans.get(cacheKey));
  const tier = p.get("tier");
  const market = p.get("market") ?? "skinport";
  const variant = p.get("stattrak") === "1" ? "stattrak" : "normal";
  const budget = Number(p.get("budget"));
  const minBudget = Number(p.get("minBudget"));
  if (!isTier(tier))
    return Response.json(
      { error: "Pick a rarity to trade up." },
      { status: 400 },
    );
  if (!isMarketplaceId(market))
    return Response.json({ error: "Pick where you'll sell." }, { status: 400 });

  const hideRisky = p.get("hideRisky") === "1";
  const { holdDays } = getSettings(db);
  const data = loadTierData(db, tier, variant, p.get("owned") !== "0");
  const withVolume = (c: FoundContract) =>
    c.result.outcomes.map((o) => ({
      ...o,
      volume30d: data.volume30d(o.skin, o.wear),
    }));
  const isRisky = (c: FoundContract) =>
    riskNotes(withVolume(c), c.result.evCents).length > 0;

  const contracts = findContracts(data.options, data.outcomes, data.price, {
    tier,
    market: MARKETPLACES[market],
    budgetCents: budget > 0 ? Math.round(budget * 100) : undefined,
    minBudgetCents: minBudget > 0 ? Math.round(minBudget * 100) : undefined,
    // Risk is checked inside the finder, so safe contracts aren't crowded out of the limit.
    accept: hideRisky ? (c) => !isRisky(c) : undefined,
    limit: 150,
  }).map((c) => {
    const outcomes = withVolume(c);
    // Expected back with no fee and after each marketplace's fee, so the table can compare.
    const evAfter = (net: (p: number) => number) =>
      Math.round(
        outcomes.reduce(
          (s, o) => s + o.probability * net(o.priceCents ?? 0),
          0,
        ),
      );
    const nets = outcomes.map((o) => o.netCents);
    return {
      ...c,
      risky: isRisky(c),
      timeline: contractTimeline(holdDays, outcomes),
      grossEvCents: evAfter((x) => x),
      evByMarket: Object.fromEntries(
        MARKETPLACE_IDS.map((id) => [id, evAfter(MARKETPLACES[id].net)]),
      ) as Record<MarketplaceId, number>,
      bestCents: Math.max(...nets),
      worstCents: Math.min(...nets),
      result: { ...c.result, outcomes },
    };
  });
  const body = {
    tier,
    outcomeTier: nextTier(tier),
    variant,
    market,
    options: data.options.length,
    contracts,
  };
  if (scans.size > 30) scans.clear();
  scans.set(cacheKey, body);
  return Response.json(body);
}
