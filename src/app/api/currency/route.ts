import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { getRates } from "@/lib/currency";

export async function GET() {
  await connection();
  return Response.json(await getRates(getDb()));
}
