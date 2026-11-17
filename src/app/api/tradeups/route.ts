import { getDb } from "@/lib/db";
import { isMarketplaceId, MARKETPLACES } from "@/lib/fees";
import { findContracts } from "@/lib/finder";
import { isTier } from "@/lib/tradeup";
import { loadTierData } from "@/lib/tradeup-data";
import { riskNotes } from "@/lib/risk";

/** Scans one tier for the most profitable contracts. Takes about a second. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const tier = p.get("tier");
  const market = p.get("market") ?? "skinport";
  const variant = p.get("stattrak") === "1" ? "stattrak" : "normal";
  const budget = Number(p.get("budget"));
  if (!isTier(tier))
    return Response.json(
      { error: "Pick a rarity to trade up." },
      { status: 400 },
    );
  if (!isMarketplaceId(market))
    return Response.json({ error: "Pick where you'll sell." }, { status: 400 });

  const hideRisky = p.get("hideRisky") === "1";
  const data = loadTierData(getDb(), tier, variant);
  const contracts = findContracts(data.options, data.outcomes, data.price, {
    tier,
    market: MARKETPLACES[market],
    budgetCents: budget > 0 ? Math.round(budget * 100) : undefined,
    limit: 2000,
  })
    .map((c) => {
      const outcomes = c.result.outcomes.map((o) => ({
        ...o,
        volume30d: data.volume30d(o.skin, o.wear),
      }));
      const risky = riskNotes(outcomes, c.result.evCents).length > 0;
      return { ...c, risky, result: { ...c.result, outcomes } };
    })
    .filter((c) => !hideRisky || !c.risky)
    .slice(0, 50);
  return Response.json({
    tier,
    variant,
    market,
    options: data.options.length,
    contracts,
  });
}
