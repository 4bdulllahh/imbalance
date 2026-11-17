export const DAY = 86_400_000;

/**
 * Rough days to sell at the usual price, from how often it sold in 30 days. Listing at the
 * median puts you in a queue with other sellers, so allow for a few sales to go by first.
 * Null when it hasn't sold at all: it may not sell at that price.
 */
export function daysToSell(volume30d: number): number | null {
  if (volume30d <= 0) return null;
  return Math.min(60, Math.max(0.5, (30 / volume30d) * 3));
}

export type ContractTimeline = {
  /** Days until the output can be traded or sold (trade protection). */
  holdDays: number;
  /** Expected days to sell the output once tradable (unsellable outcomes count as 30). */
  sellDays: number;
  totalDays: number;
};

export function contractTimeline(
  holdDays: number,
  outcomes: readonly { probability: number; volume30d: number }[],
): ContractTimeline {
  const sellDays = outcomes.reduce(
    (s, o) => s + o.probability * (daysToSell(o.volume30d) ?? 30),
    0,
  );
  return { holdDays, sellDays, totalDays: holdDays + sellDays };
}

export type StepHolding = {
  id: number;
  marketHashName: string;
  tradableAt: number;
  status: string;
  costCents: number;
  valueCents: number | null;
};

export type NextStep = {
  id: number;
  kind: "sell" | "wait" | "hold";
  marketHashName: string;
  at: number;
  gainCents: number | null;
};

const RANK: Record<NextStep["kind"], number> = { sell: 0, hold: 1, wait: 2 };

/**
 * What to do next with each item you hold: sell (tradable and worth more than you paid),
 * hold (tradable but selling now loses money), or wait (still trade-locked). Plus the date to
 * come back: when the next locked item unlocks.
 */
export function nextSteps(
  holdings: readonly StepHolding[],
  now: number,
): { steps: NextStep[]; comeBackAt: number | null } {
  const steps = holdings
    .filter((h) => h.status === "holding")
    .map((h): NextStep => {
      const gainCents =
        h.valueCents == null ? null : h.valueCents - h.costCents;
      if (h.tradableAt > now)
        return {
          id: h.id,
          kind: "wait",
          marketHashName: h.marketHashName,
          at: h.tradableAt,
          gainCents,
        };
      return {
        id: h.id,
        kind: gainCents != null && gainCents > 0 ? "sell" : "hold",
        marketHashName: h.marketHashName,
        at: h.tradableAt,
        gainCents,
      };
    })
    .sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.at - b.at);
  const locked = steps.filter((s) => s.kind === "wait").map((s) => s.at);
  return { steps, comeBackAt: locked.length ? Math.min(...locked) : null };
}
