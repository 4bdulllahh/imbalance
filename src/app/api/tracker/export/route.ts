import { getDb } from "@/lib/db";
import { exportTracker } from "@/lib/tracker";

/** Downloads the tracker as a JSON backup. */
export async function GET(req: Request) {
  void req;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(exportTracker(getDb()), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="imbalance-backup-${date}.json"`,
    },
  });
}
