import { describe, expect, it } from "vitest";
import { openDb } from "./db";
import { saveCatalog } from "./catalog";
import { saveSkinport } from "./prices/skinport";
import { getStatus, searchSkins, skinDetail } from "./queries";
import { isSameOrigin } from "./same-origin";

function seeded() {
  const db = openDb(":memory:");
  saveCatalog(db, {
    skins: [
      {
        id: "s1",
        name: "AK-47 | Redline",
        rarity: { id: "r", name: "Classified" },
        min_float: 0.1,
        max_float: 0.7,
        stattrak: true,
        wears: [
          { id: "a", name: "Minimal Wear" },
          { id: "b", name: "Field-Tested" },
        ],
        collections: [{ id: "c1", name: "The Phoenix Collection" }],
      },
      {
        id: "s2",
        name: "P250 | Sand Dune",
        rarity: { id: "r2", name: "Consumer Grade" },
        wears: [],
      },
    ],
    collections: [{ id: "c1", name: "The Phoenix Collection" }],
    crates: [],
  });
  saveSkinport(db, {
    items: [
      {
        market_hash_name: "AK-47 | Redline (Field-Tested)",
        min_price: 18,
        quantity: 5,
      },
      {
        market_hash_name: "AK-47 | Redline (Minimal Wear)",
        min_price: 40,
        quantity: 2,
      },
      {
        market_hash_name: "StatTrak™ AK-47 | Redline (Field-Tested)",
        min_price: 50,
        quantity: 1,
      },
    ],
    history: [],
  });
  return db;
}

describe("queries", () => {
  it("searches by skin or collection name with the cheapest normal price", () => {
    const db = seeded();
    const res = searchSkins(db, { q: "phoenix" });
    expect(res.total).toBe(1);
    expect(res.skins[0]).toMatchObject({
      name: "AK-47 | Redline",
      fromCents: 1800,
      collections: ["The Phoenix Collection"],
    });
    expect(
      searchSkins(db, { rarity: "Consumer Grade" }).skins[0].fromCents,
    ).toBeNull();
  });

  it("lists every wear and StatTrak price for one skin", () => {
    const d = skinDetail(seeded(), "s1")!;
    expect(d.prices).toHaveLength(4);
    expect(
      d.prices.find(
        (p) => p.variant === "stattrak" && p.wear === "Field-Tested",
      )?.minCents,
    ).toBe(5000);
    expect(skinDetail(seeded(), "nope")).toBeNull();
  });

  it("reports status counts", () => {
    expect(getStatus(seeded())).toMatchObject({
      skins: 2,
      collections: 1,
      prices: 3,
    });
  });
});

describe("isSameOrigin", () => {
  const req = (h: Record<string, string>) =>
    new Request("http://localhost:3000/api/x", { method: "POST", headers: h });
  it("allows the app itself and blocks other sites", () => {
    expect(
      isSameOrigin(
        req({ origin: "http://localhost:3000", host: "localhost:3000" }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        req({ origin: "https://evil.example", host: "localhost:3000" }),
      ),
    ).toBe(false);
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
  });
});
