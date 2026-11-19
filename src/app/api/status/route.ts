import { connection } from "next/server";
import { getDb, getLimits } from "@/lib/db";
import { getStatus } from "@/lib/queries";
import { keyStatus } from "@/lib/keys";
import { cooldownLeft } from "@/lib/sync-state";

export async function GET() {
  await connection();
  const db = getDb();
  const limits = getLimits(db);
  return Response.json({
    ...getStatus(db),
    keys: keyStatus(),
    limits,
    pricesCooldownMs: cooldownLeft(
      db,
      "skinport_synced_at",
      limits.skinportMinutes * 60_000,
    ),
  });
}
