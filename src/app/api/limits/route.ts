import { connection } from "next/server";
import { getDb, getLimits, saveLimits } from "@/lib/db";
import { limitsSchema } from "@/lib/limiter";
import { isSameOrigin } from "@/lib/same-origin";
import { forbidden } from "../errors";

export async function GET() {
  await connection();
  return Response.json(getLimits(getDb()));
}

/** Saves the user's API limits. Values under the safe floors are refused, not clamped. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  const parsed = limitsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  saveLimits(getDb(), parsed.data);
  return Response.json(parsed.data);
}
