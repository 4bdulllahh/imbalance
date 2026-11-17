import { connection } from "next/server";
import { KEY_DEFS, keyStatus, saveKeys } from "@/lib/keys";
import { isSameOrigin } from "@/lib/same-origin";
import { errorResponse, forbidden } from "../errors";

/** Key definitions and which ones are set. Never returns the key values. */
export async function GET() {
  await connection();
  return Response.json({ defs: KEY_DEFS, status: keyStatus() });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Send the keys as an object.");
    saveKeys(body as Record<string, unknown>);
    return Response.json({ status: keyStatus() });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
