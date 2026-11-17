import { getDb } from "@/lib/db";
import {
  fetchSkinport,
  saveSkinport,
  SYNC_COOLDOWN_MS,
} from "@/lib/prices/skinport";
import { cooldownLeft } from "@/lib/sync-state";
import { isSameOrigin } from "@/lib/same-origin";
import { errorResponse, forbidden } from "../../errors";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  const db = getDb();
  const wait = cooldownLeft(db, "skinport_synced_at", SYNC_COOLDOWN_MS);
  if (wait > 0) {
    const min = Math.ceil(wait / 60_000);
    return Response.json(
      {
        error: `Prices were updated recently. Skinport allows a refresh every 5 minutes, try again in ${min} min.`,
      },
      { status: 429 },
    );
  }
  try {
    return Response.json(saveSkinport(db, await fetchSkinport()));
  } catch (err) {
    return errorResponse(err, 502);
  }
}
