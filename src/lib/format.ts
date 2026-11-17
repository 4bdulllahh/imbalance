/** Cents to a price string. Currency conversion arrives in M6. */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatAgo(ms: number | null, now?: number): string {
  if (ms == null) return "never";
  const min = Math.round(((now ?? Date.now()) - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
