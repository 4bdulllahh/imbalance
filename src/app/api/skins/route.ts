import { getDb } from "@/lib/db";
import { searchSkins } from "@/lib/queries";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const page = Number(p.get("page") ?? 1);
  return Response.json(
    searchSkins(getDb(), {
      q: p.get("q")?.slice(0, 100) || undefined,
      rarity: p.get("rarity") || undefined,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    }),
  );
}
