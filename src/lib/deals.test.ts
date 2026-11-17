import { afterEach, describe, expect, it, vi } from "vitest";
import { openDb } from "./db";
import { saveSkinport } from "./prices/skinport";
import { baseSkinName, findDeals } from "./deals";
import { MARKETPLACES } from "./fees";
import { overviewSchema, steamPrice } from "./prices/steam";

const win = (median: number | null, volume: number) => ({ median, volume });
function seeded() {
  const db = openDb(":memory:");
  const hist = (
    name: string,
    m7: number,
    m30: number,
    m90: number,
    vol: number,
  ) => ({
    market_hash_name: name,
    last_24_hours: win(null, 0),
    last_7_days: win(m7, vol),
    last_30_days: win(m30, vol),
    last_90_days: win(m90, vol),
  });
  saveSkinport(db, {
    items: [
      {
        market_hash_name: "AK-47 | Redline (Field-Tested)",
        min_price: 15,
        quantity: 4,
      },
      {
        market_hash_name: "AWP | Asiimov (Field-Tested)",
        min_price: 99,
        quantity: 9,
      },
      {
        market_hash_name: "Rare Thing (Factory New)",
        min_price: 1,
        quantity: 1,
      },
      { market_hash_name: "Sticker | Cheap", min_price: 1, quantity: 50 },
    ],
    history: [
      hist("AK-47 | Redline (Field-Tested)", 17, 20, 22, 50), // 25% under usual, falling
      hist("AWP | Asiimov (Field-Tested)", 100, 100, 100, 50), // only 1% under
      hist("Rare Thing (Factory New)", 50, 50, 50, 2), // cheap but never sells
      hist("Sticker | Cheap", 2, 2, 2, 100),
    ],
  });
  return db;
}

afterEach(() => vi.unstubAllGlobals());

describe("findDeals", () => {
  it("finds liquid items under their usual price that flip for profit after fees", () => {
    const deals = findDeals(seeded(), {
      market: MARKETPLACES.skinport,
      weaponsOnly: true,
    });
    expect(deals).toHaveLength(1);
    expect(deals[0]).toMatchObject({
      marketHashName: "AK-47 | Redline (Field-Tested)",
      buyCents: 1500,
      usualCents: 2000,
      netResaleCents: 1840,
      flipProfitCents: 340,
      trend: "falling",
    });
    expect(deals[0].discount).toBeCloseTo(0.25);
  });

  it("includes stickers unless weapons only, and respects max price", () => {
    const db = seeded();
    expect(
      findDeals(db, { market: MARKETPLACES.skinport }).map(
        (d) => d.marketHashName,
      ),
    ).toContain("Sticker | Cheap");
    expect(
      findDeals(db, { market: MARKETPLACES.skinport, maxBuyCents: 1000 }).map(
        (d) => d.marketHashName,
      ),
    ).toEqual(["Sticker | Cheap"]);
  });

  it("strips wear and prefixes for image lookup", () => {
    expect(baseSkinName("StatTrak™ AK-47 | Redline (Field-Tested)")).toBe(
      "AK-47 | Redline",
    );
    expect(baseSkinName("★ StatTrak™ Karambit | Fade (Factory New)")).toBe(
      "★ Karambit | Fade",
    );
  });
});

describe("steamPrice", () => {
  it("parses Steam's text prices and caches for 10 minutes", async () => {
    expect(
      overviewSchema.parse({
        success: true,
        lowest_price: "$1,030.72",
        volume: "1,052",
      }),
    ).toMatchObject({
      lowest_price: 103072,
      volume: 1052,
    });
    const db = openDb(":memory:");
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        lowest_price: "$30.72",
        median_price: "$30.38",
        volume: "52",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await steamPrice(db, "x", 1000)).toMatchObject({
      lowestCents: 3072,
      medianCents: 3038,
      volume24h: 52,
    });
    await steamPrice(db, "x", 1000 + 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
