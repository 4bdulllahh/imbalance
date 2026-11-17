import { describe, expect, it } from "vitest";
import { openDb } from "../db";
import { cooldownLeft } from "../sync-state";
import {
  itemsSchema,
  saveSkinport,
  SYNC_COOLDOWN_MS,
  type SkinportData,
} from "./skinport";

const win = (median: number | null, volume: number) => ({ median, volume });
const data: SkinportData = {
  items: [
    {
      market_hash_name: "AK-47 | Redline (Field-Tested)",
      suggested_price: 20.5,
      min_price: 18.99,
      median_price: 19.5,
      quantity: 40,
    },
    {
      market_hash_name: "★ Karambit | Doppler (Factory New)",
      version: "Phase 2",
      min_price: 900,
      quantity: 3,
    },
    { market_hash_name: "Rare Thing", min_price: null, quantity: 0 },
    {
      market_hash_name: "Sticker | s1mple (Holo) | Cologne 2026",
      min_price: 1,
      quantity: 5,
    },
  ],
  history: [
    {
      market_hash_name: "AK-47 | Redline (Field-Tested)",
      last_24_hours: win(19, 10),
      last_7_days: win(19.2, 80),
      last_30_days: win(20, 300),
      last_90_days: win(21, 900),
    },
  ],
};

describe("saveSkinport", () => {
  it("stores prices in cents, keeps versions apart, and snapshots weapon skins", () => {
    const db = openDb(":memory:");
    expect(saveSkinport(db, data, 100_000_000)).toEqual({
      items: 4,
      history: 1,
      snapshot: true,
    });
    expect(
      db
        .prepare(
          "SELECT min_cents, suggested_cents FROM prices WHERE market_hash_name LIKE 'AK%'",
        )
        .get(),
    ).toEqual({
      min_cents: 1899,
      suggested_cents: 2050,
    });
    expect(
      db
        .prepare("SELECT version FROM prices WHERE market_hash_name LIKE '★%'")
        .get(),
    ).toEqual({ version: "Phase 2" });
    expect(
      db.prepare("SELECT median_7d, volume_90d FROM price_history").get(),
    ).toEqual({ median_7d: 1920, volume_90d: 900 });

    // Items with no price, and stickers, get no snapshot. A sync 10 minutes later adds no new snapshot.
    expect(db.prepare("SELECT COUNT(*) n FROM price_snapshots").get()).toEqual({
      n: 2,
    });
    expect(saveSkinport(db, data, 100_000_000 + 600_000).snapshot).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM prices").get()).toEqual({ n: 4 });
  });

  it("enforces the sync cooldown", () => {
    const db = openDb(":memory:");
    saveSkinport(db, data, 100_000_000);
    expect(
      cooldownLeft(
        db,
        "skinport_synced_at",
        SYNC_COOLDOWN_MS,
        100_000_000 + 60_000,
      ),
    ).toBe(SYNC_COOLDOWN_MS - 60_000);
    expect(
      cooldownLeft(
        db,
        "skinport_synced_at",
        SYNC_COOLDOWN_MS,
        100_000_000 + SYNC_COOLDOWN_MS,
      ),
    ).toBe(0);
  });

  it("rejects negative quantities", () => {
    expect(
      itemsSchema.safeParse([{ market_hash_name: "x", quantity: -1 }]).success,
    ).toBe(false);
  });
});
