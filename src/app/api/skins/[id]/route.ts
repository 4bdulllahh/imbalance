import { getDb } from "@/lib/db";
import { skinDetail } from "@/lib/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const detail = skinDetail(getDb(), (await params).id);
  return detail
    ? Response.json(detail)
    : Response.json({ error: "Skin not found." }, { status: 404 });
}
