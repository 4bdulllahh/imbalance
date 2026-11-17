export type RiskOutcome = {
  probability: number;
  netCents: number;
  priceCents: number | null;
  volume30d: number;
};

/** Sales in 30 days below this mean the price can't be trusted. */
export const THIN_MARKET = 3;

/**
 * Plain-English warnings for a contract. Risky when an outcome has no price, or when more
 * than a quarter of the expected value comes from skins that barely sell (their listed
 * price may be fake, and you may not find a buyer at it).
 */
export function riskNotes(
  outcomes: readonly RiskOutcome[],
  evCents: number,
): string[] {
  const notes: string[] = [];
  const missing = outcomes.filter((o) => o.priceCents == null).length;
  if (missing) notes.push(`${missing} outcome(s) have no price, counted as 0`);
  const thinValue = outcomes
    .filter((o) => o.volume30d < THIN_MARKET)
    .reduce((s, o) => s + o.probability * o.netCents, 0);
  if (evCents > 0 && thinValue / evCents > 0.25) {
    notes.push(
      `${Math.round((thinValue / evCents) * 100)}% of the expected value comes from skins that sold under ${THIN_MARKET} times in 30 days`,
    );
  }
  return notes;
}
