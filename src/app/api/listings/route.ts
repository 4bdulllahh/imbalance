import { getDb } from "@/lib/db";
import { getKey } from "@/lib/keys";
import {
  fetchListings,
  savedListings,
  saveListings,
} from "@/lib/prices/csfloat";
import { errorResponse } from "../errors";

/** CSFloat listings with floats for one market name. Reuses saved ones for 10 minutes. */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 200);
  if (!name)
    return Response.json({ error: "Pick a skin first." }, { status: 400 });
  const key = getKey("CSFLOAT_API_KEY");
  if (!key)
    return Response.json(
      {
        error: "Add a free CSFloat key to see listings with floats.",
        needsKey: true,
      },
      { status: 400 },
    );

  const db = getDb();
  const saved = savedListings(db, name);
  if (saved.fresh) return Response.json({ listings: saved.listings });
  try {
    const listings = await fetchListings(key, name);
    saveListings(db, name, listings);
    return Response.json({ listings });
  } catch (err) {
    return errorResponse(err, 502);
  }
}
