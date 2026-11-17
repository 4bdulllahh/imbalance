import { getDb } from "@/lib/db";

/** Up to 12 market names matching a search, for the tracker's item box. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return Response.json({ names: [] });
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT market_hash_name AS name FROM prices WHERE source = 'skinport' AND market_hash_name LIKE ?
       ORDER BY quantity DESC LIMIT 12`,
    )
    .all(`%${q}%`) as { name: string }[];
  return Response.json({ names: rows.map((r) => r.name) });
}
