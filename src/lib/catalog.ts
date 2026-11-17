import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { setMeta, transaction } from "./db";
import { fetchJson } from "./http";

// ByMykel's CSGO-API. The old bymykel.github.io address now 404s.
const BASE =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";

const ref = z.object({ id: z.string(), name: z.string() });

const skinSchema = z.object({
  id: z.string(),
  name: z.string(),
  weapon: ref.nullish(),
  category: ref.nullish(),
  rarity: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullish(),
  }),
  min_float: z.number().nullish(),
  max_float: z.number().nullish(),
  stattrak: z.boolean().nullish(),
  souvenir: z.boolean().nullish(),
  image: z.string().nullish(),
  wears: z.array(ref).nullish(),
  collections: z.array(ref.extend({ image: z.string().nullish() })).nullish(),
});

const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  crates: z.array(ref).nullish(),
});

const crateSchema = z.object({
  id: z.string(),
  contains_rare: z
    .array(
      ref.extend({ phase: z.string().nullish(), image: z.string().nullish() }),
    )
    .nullish(),
});

export const skinsSchema = z.array(skinSchema);
export const collectionsSchema = z.array(collectionSchema);
export const cratesSchema = z.array(crateSchema);

export type CatalogData = {
  skins: z.infer<typeof skinsSchema>;
  collections: z.infer<typeof collectionsSchema>;
  crates: z.infer<typeof cratesSchema>;
};

export async function fetchCatalog(): Promise<CatalogData> {
  const [skins, collections, crates] = await Promise.all([
    fetchJson(`${BASE}/skins.json`, skinsSchema),
    fetchJson(`${BASE}/collections.json`, collectionsSchema),
    fetchJson(`${BASE}/crates.json`, cratesSchema),
  ]);
  return { skins, collections, crates };
}

/** Replaces the catalog in one transaction. Returns counts for the UI. */
export function saveCatalog(db: DatabaseSync, data: CatalogData) {
  const rareByCrate = new Map(
    data.crates.map((c) => [c.id, c.contains_rare ?? []]),
  );
  let rareCount = 0;

  transaction(db, () => {
    db.exec(
      "DELETE FROM skin_collections; DELETE FROM rare_pool; DELETE FROM skins; DELETE FROM collections;",
    );

    const insCol = db.prepare(
      "INSERT INTO collections (id, name, image) VALUES (?, ?, ?)",
    );
    const insRare = db.prepare(
      "INSERT OR IGNORE INTO rare_pool (collection_id, skin_id, name, phase, image) VALUES (?, ?, ?, ?, ?)",
    );
    for (const c of data.collections) {
      insCol.run(c.id, c.name, c.image ?? null);
      for (const crate of c.crates ?? []) {
        for (const r of rareByCrate.get(crate.id) ?? []) {
          rareCount += Number(
            insRare.run(c.id, r.id, r.name, r.phase ?? "", r.image ?? null)
              .changes,
          );
        }
      }
    }

    const insSkin = db.prepare(
      `INSERT INTO skins (id, name, weapon, category, rarity_id, rarity_name, rarity_color,
         min_float, max_float, stattrak, souvenir, image, wears)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insLink = db.prepare(
      "INSERT OR IGNORE INTO skin_collections (skin_id, collection_id) VALUES (?, ?)",
    );
    for (const s of data.skins) {
      insSkin.run(
        s.id,
        s.name,
        s.weapon?.name ?? null,
        s.category?.name ?? null,
        s.rarity.id,
        s.rarity.name,
        s.rarity.color ?? null,
        s.min_float ?? null,
        s.max_float ?? null,
        s.stattrak ? 1 : 0,
        s.souvenir ? 1 : 0,
        s.image ?? null,
        JSON.stringify((s.wears ?? []).map((w) => w.name)),
      );
      for (const c of s.collections ?? []) insLink.run(s.id, c.id);
    }
    setMeta(db, "catalog_synced_at", String(Date.now()));
  });

  return {
    skins: data.skins.length,
    collections: data.collections.length,
    rareItems: rareCount,
  };
}
