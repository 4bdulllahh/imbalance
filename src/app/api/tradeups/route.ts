import { getDb } from "@/lib/db";
import { isMarketplaceId, MARKETPLACES } from "@/lib/fees";
import { findContracts } from "@/lib/finder";
import { isTier } from "@/lib/tradeup";
import { loadTierData } from "@/lib/tradeup-data";

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

  const data = loadTierData(getDb(), tier, variant);
  const contracts = findContracts(data.options, data.outcomes, data.price, {
    tier,
    market: MARKETPLACES[market],
    budgetCents: budget > 0 ? Math.round(budget * 100) : undefined,
    limit: 50,
  }).map((c) => ({
    ...c,
    result: {
      ...c.result,
      outcomes: c.result.outcomes.map((o) => ({
        ...o,
        volume7d: data.volume7d(o.skin, o.wear),
      })),
    },
  }));
  return Response.json({
    tier,
    variant,
    market,
    options: data.options.length,
    contracts,
  });
}
