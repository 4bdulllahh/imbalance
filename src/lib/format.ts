export function formatAgo(ms: number | null, now?: number): string {
  if (ms == null) return "never";
  const min = Math.round(((now ?? Date.now()) - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
