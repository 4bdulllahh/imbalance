export function formatAgo(ms: number | null, now?: number): string {
  if (ms == null) return "never";
  const min = Math.round(((now ?? Date.now()) - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

/**
 * Formats USD cents in another currency. Conversion happens only here, for display:
 * everything stored and calculated stays in USD cents.
 */
export function formatIn(
  usdCents: number | null | undefined,
  currency: string,
  rate: number,
): string {
  if (usdCents == null) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format((usdCents / 100) * rate);
  } catch {
    return `${((usdCents / 100) * rate).toFixed(2)} ${currency}`;
  }
}
