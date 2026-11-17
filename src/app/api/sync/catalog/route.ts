import { getDb } from "@/lib/db";
import { fetchCatalog, saveCatalog } from "@/lib/catalog";
import { isSameOrigin } from "@/lib/same-origin";
import { errorResponse, forbidden } from "../../errors";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  try {
    return Response.json(saveCatalog(getDb(), await fetchCatalog()));
  } catch (err) {
    return errorResponse(err, 502);
  }
}
