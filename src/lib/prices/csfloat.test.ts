import { describe, expect, it } from "vitest";
import { openDb } from "../db";
import {
  listingsResponseSchema,
  savedListings,
  saveListings,
  type Listing,
} from "./csfloat";

const raw = {
  id: 123,
  price: 1899,
  item: {
    market_hash_name: "AK-47 | Redline (Field-Tested)",
    float_value: 0.151,
    paint_seed: 7,
  },
};

describe("csfloat", () => {
  it("accepts both response shapes", () => {
    expect(listingsResponseSchema.parse([raw])[0].id).toBe("123");
    expect(
      listingsResponseSchema.parse({ data: [raw], cursor: "x" }),
    ).toHaveLength(1);
    expect(
      listingsResponseSchema.safeParse([{ ...raw, price: 18.99 }]).success,
    ).toBe(false);
  });

  it("replaces listings per item and reports freshness", () => {
    const db = openDb(":memory:");
    const name = "AK-47 | Redline (Field-Tested)";
    const l = (id: string, priceCents: number): Listing => ({
      id,
      marketHashName: name,
      priceCents,
      float: 0.2,
      paintSeed: 1,
      url: "u",
    });
    saveListings(db, name, [l("a", 500), l("b", 300)], 1000);
    saveListings(db, name, [l("c", 400)], 2000);
    const { fresh, listings } = savedListings(db, name, 2000 + 60_000);
    expect(fresh).toBe(true);
    expect(listings.map((x) => x.id)).toEqual(["c"]);
    expect(savedListings(db, name, 2000 + 11 * 60_000).fresh).toBe(false);
  });
});
