import { wearForFloat, WEARS, type WearName } from "./wear";
import type { Marketplace } from "./fees";

/** Input rarities in trade-up order. Covert trades up into the collection's knife/glove pool. */
export const TIERS = [
  "Consumer Grade",
  "Industrial Grade",
  "Mil-Spec Grade",
  "Restricted",
  "Classified",
  "Covert",
] as const;
export type Tier = (typeof TIERS)[number];

export const isTier = (v: unknown): v is Tier => TIERS.includes(v as Tier);
export const nextTier = (t: Tier): Tier | "Rare" =>
  t === "Covert" ? "Rare" : TIERS[TIERS.indexOf(t) + 1];
/** 10 inputs normally, 5 for Covert into knives and gloves. */
export const inputCount = (t: Tier) => (t === "Covert" ? 5 : 10);

export type ContractInput = {
  collectionId: string;
  float: number;
  minFloat: number;
  maxFloat: number;
  costCents: number;
};

export type OutcomeSkin = {
  id: string;
  name: string;
  collectionId: string;
  minFloat: number;
  maxFloat: number;
  /** False for vanilla knives, which have no wear. */
  hasWear: boolean;
  phase?: string;
  image?: string | null;
};

/** Gross sell price in cents for an outcome at a wear, or null when unknown. */
export type PriceFn = (
  skin: OutcomeSkin,
  wear: WearName | null,
) => number | null;

export type Outcome = {
  skin: OutcomeSkin;
  probability: number;
  float: number;
  wear: WearName | null;
  priceCents: number | null;
  netCents: number;
  /** Average normalized input float needed to reach the next better wear, if any. */
  betterWear: { wear: WearName; maxAvgNorm: number } | null;
};

export type ContractResult = {
  costCents: number;
  avgNormFloat: number;
  outcomes: Outcome[];
  evCents: number;
  profitCents: number;
  roiPercent: number;
  oddsToProfit: number;
  missingPrices: number;
};

/** Input float scaled to 0..1 within its own skin's range. */
export function normalizeFloat(f: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (f - min) / (max - min)));
}

export function outputFloat(avgNorm: number, min: number, max: number): number {
  return min + avgNorm * (max - min);
}

/**
 * Chance of each outcome. Every input adds all next-tier skins of its own collection to a
 * pool, and the game picks one at random from that pool. So a skin from collection C has
 * chance (inputs from C) / (sum over all inputs of their collection's outcome count).
 */
export function outcomeProbabilities(
  inputCollections: string[],
  outcomesByCollection: ReadonlyMap<string, readonly OutcomeSkin[]>,
): { skin: OutcomeSkin; probability: number }[] {
  const counts = new Map<string, number>();
  for (const c of inputCollections) counts.set(c, (counts.get(c) ?? 0) + 1);
  let tickets = 0;
  for (const [c, k] of counts)
    tickets += k * (outcomesByCollection.get(c)?.length ?? 0);
  if (tickets === 0) return [];
  return [...counts].flatMap(([c, k]) =>
    (outcomesByCollection.get(c) ?? []).map((skin) => ({
      skin,
      probability: k / tickets,
    })),
  );
}

/** Lowest average normalized float that still lands this outcome one wear better. */
function betterWearTarget(skin: OutcomeSkin, wear: WearName | null) {
  if (!wear || !skin.hasWear) return null;
  const idx = WEARS.findIndex((w) => w.name === wear);
  if (idx === 0) return null;
  const target = WEARS[idx - 1];
  if (target.max <= skin.minFloat) return null; // skin can't reach that wear
  return {
    wear: target.name,
    maxAvgNorm: normalizeFloat(target.max, skin.minFloat, skin.maxFloat),
  };
}

export class ContractError extends Error {}

/** Full maths for one contract. All money in integer USD cents. */
export function evaluateContract(
  tier: Tier,
  inputs: readonly ContractInput[],
  outcomesByCollection: ReadonlyMap<string, readonly OutcomeSkin[]>,
  price: PriceFn,
  market: Marketplace,
): ContractResult {
  const n = inputCount(tier);
  if (inputs.length !== n)
    throw new ContractError(`A ${tier} contract needs exactly ${n} skins.`);
  for (const i of inputs) {
    if (!outcomesByCollection.get(i.collectionId)?.length) {
      throw new ContractError(
        `A skin's collection has nothing higher to trade up into.`,
      );
    }
    if (!(i.float >= i.minFloat && i.float <= i.maxFloat)) {
      throw new ContractError(`Float ${i.float} is outside that skin's range.`);
    }
  }

  const costCents = inputs.reduce((s, i) => s + i.costCents, 0);
  const avgNormFloat =
    inputs.reduce(
      (s, i) => s + normalizeFloat(i.float, i.minFloat, i.maxFloat),
      0,
    ) / n;

  let ev = 0;
  let odds = 0;
  let missingPrices = 0;
  const outcomes: Outcome[] = outcomeProbabilities(
    inputs.map((i) => i.collectionId),
    outcomesByCollection,
  ).map(({ skin, probability }) => {
    const float = outputFloat(avgNormFloat, skin.minFloat, skin.maxFloat);
    const wear = skin.hasWear ? wearForFloat(float) : null;
    const priceCents = price(skin, wear);
    const netCents = priceCents == null ? 0 : market.net(priceCents);
    if (priceCents == null) missingPrices++;
    ev += probability * netCents;
    if (netCents > costCents) odds += probability;
    return {
      skin,
      probability,
      float,
      wear,
      priceCents,
      netCents,
      betterWear: betterWearTarget(skin, wear),
    };
  });

  const evCents = Math.round(ev);
  return {
    costCents,
    avgNormFloat,
    outcomes: outcomes.sort(
      (a, b) => b.probability * b.netCents - a.probability * a.netCents,
    ),
    evCents,
    profitCents: evCents - costCents,
    roiPercent: costCents > 0 ? ((evCents - costCents) / costCents) * 100 : 0,
    oddsToProfit: odds,
    missingPrices,
  };
}
