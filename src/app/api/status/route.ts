import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { getStatus } from "@/lib/queries";
import { keyStatus } from "@/lib/keys";
import { cooldownLeft } from "@/lib/sync-state";
import { SYNC_COOLDOWN_MS } from "@/lib/prices/skinport";

export async function GET() {
  await connection();
  const db = getDb();
  return Response.json({
    ...getStatus(db),
    keys: keyStatus(),
    pricesCooldownMs: cooldownLeft(db, "skinport_synced_at", SYNC_COOLDOWN_MS),
  });
}
