import { statSync } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { getDb, getLimits, SCHEMA_VERSION } from "@/lib/db";
import { keyStatus } from "@/lib/keys";
import { clearLogs, recentErrors, recentRequests } from "@/lib/limiter";
import { getStatus } from "@/lib/queries";
import { isSameOrigin } from "@/lib/same-origin";
import { forbidden } from "../errors";
import pkg from "../../../../package.json";

/** Everything useful for troubleshooting, with no secrets: keys show only as set or not. */
export async function GET() {
  await connection();
  const db = getDb();
  const file =
    process.env.IMBALANCE_DB ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "imbalance.db");
  let dbBytes: number | null = null;
  try {
    dbBytes = statSync(file).size;
  } catch {}
  const tables = (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((t) => ({
    name: t.name,
    rows: (
      db.prepare(`SELECT COUNT(*) n FROM "${t.name}"`).get() as { n: number }
    ).n,
  }));
  const { user_version } = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  return Response.json({
    app: { version: pkg.version, next: pkg.dependencies.next },
    runtime: {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      mode: process.env.NODE_ENV,
      uptimeMin: Math.round(process.uptime() / 60),
      memoryMb: Math.round(process.memoryUsage().rss / 1e6),
    },
    database: {
      schema: user_version,
      expected: SCHEMA_VERSION,
      dbBytes,
      tables,
    },
    status: getStatus(db),
    keys: keyStatus(),
    limits: getLimits(db),
    requests: recentRequests(),
    errors: recentErrors(),
  });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  clearLogs();
  return Response.json({ ok: true });
}
