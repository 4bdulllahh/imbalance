/**
 * Blocks other websites from triggering actions on the local server (a page you visit could
 * otherwise POST to localhost:3000 and overwrite your keys). Browsers always send Origin on POST.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
