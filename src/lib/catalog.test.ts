import { describe, expect, it } from "vitest";
import { openDb } from "./db";
import { saveCatalog, skinsSchema, type CatalogData } from "./catalog";

const data: CatalogData = {
  skins: [
    {
      id: "skin-1",
      name: "AK-47 | Redline",
      weapon: { id: "weapon_ak47", name: "AK-47" },
      rarity: {
        id: "rarity_legendary_weapon",
        name: "Classified",
        color: "#d32ce6",
      },
      min_float: 0.1,
      max_float: 0.7,
      stattrak: true,
      souvenir: false,
      image: "https://example.com/a.png",
      wears: [{ id: "w1", name: "Field-Tested" }],
      collections: [{ id: "col-1", name: "The Phoenix Collection" }],
    },
  ],
  collections: [
    {
      id: "col-1",
      name: "The Phoenix Collection",
      crates: [{ id: "crate-1", name: "Case" }],
    },
    { id: "col-2", name: "Map Collection", crates: [] },
  ],
  crates: [
    {
      id: "crate-1",
      contains_rare: [
        { id: "knife-1", name: "★ Karambit | Doppler", phase: "Phase 2" },
        { id: "knife-1", name: "★ Karambit | Doppler", phase: "Phase 3" },
      ],
    },
  ],
};

describe("saveCatalog", () => {
  it("saves skins, collection links and rare pools", () => {
    const db = openDb(":memory:");
    expect(saveCatalog(db, data)).toEqual({
      skins: 1,
      collections: 2,
      rareItems: 2,
    });
    const skin = db.prepare("SELECT * FROM skins").get() as Record<
      string,
      unknown
    >;
    expect(skin).toMatchObject({
      name: "AK-47 | Redline",
      stattrak: 1,
      min_float: 0.1,
      wears: '["Field-Tested"]',
    });
    expect(
      db.prepare("SELECT collection_id FROM skin_collections").all(),
    ).toEqual([{ collection_id: "col-1" }]);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) n FROM rare_pool WHERE collection_id = 'col-2'",
        )
        .get(),
    ).toEqual({ n: 0 });
  });

  it("replaces the old catalog on a second sync", () => {
    const db = openDb(":memory:");
    saveCatalog(db, data);
    saveCatalog(db, data);
    expect(db.prepare("SELECT COUNT(*) n FROM skins").get()).toEqual({ n: 1 });
  });

  it("rejects data in the wrong shape", () => {
    expect(skinsSchema.safeParse([{ id: 1 }]).success).toBe(false);
  });
});
