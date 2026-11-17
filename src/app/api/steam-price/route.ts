import { getDb } from "@/lib/db";
import { steamPrice } from "@/lib/prices/steam";
import { errorResponse } from "../errors";

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 200);
  if (!name)
    return Response.json({ error: "Pick an item first." }, { status: 400 });
  try {
    return Response.json(await steamPrice(getDb(), name));
  } catch (err) {
    return errorResponse(err, 502);
  }
}
