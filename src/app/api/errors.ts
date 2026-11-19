import { logError } from "@/lib/limiter";

/** Plain-English JSON error. The UI shows `error` as is. Also kept for the Dev tools page. */
export function errorResponse(err: unknown, status = 500): Response {
  console.error(err);
  logError(`API ${status}`, err);
  const message =
    err instanceof Error ? err.message : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status });
}

export const forbidden = () =>
  Response.json(
    { error: "Blocked: this request didn't come from Imbalance itself." },
    { status: 403 },
  );
