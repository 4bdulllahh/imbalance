/** Plain-English JSON error. The UI shows `error` as is. */
export function errorResponse(err: unknown, status = 500): Response {
  console.error(err);
  const message =
    err instanceof Error ? err.message : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status });
}

export const forbidden = () =>
  Response.json(
    { error: "Blocked: this request didn't come from Imbalance itself." },
    { status: 403 },
  );
