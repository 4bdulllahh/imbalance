import type { Marketplace } from "./fees";
import {
  ContractError,
  evaluateContract,
  inputCount,
  type ContractResult,
  type OutcomeSkin,
  type PriceFn,
  type Tier,
} from "./tradeup";
import type { WearName } from "./wear";

/** One way to buy an input: a skin at a wear, priced, with the worst float that wear allows. */
export type InputOption = {
  skinId: string;
  skinName: string;
  image: string | null;
  collectionId: string;
  wear: WearName;
  marketHashName: string;
  /** Worst-case float when buying "any" listing at this wear. */
  float: number;
  minFloat: number;
  maxFloat: number;
  costCents: number;
  quantity: number;
  /**
   * True for skins the user already owns (from the tracker). Their cost is today's market
   * price: using them gives up selling them. Float is the worst one they own.
   */
  owned?: boolean;
};

export type FoundContract = {
  key: string;
  inputs: { option: InputOption; count: number }[];
  result: ContractResult;
};

export type FinderOptions = {
  tier: Tier;
  market: Marketplace;
  budgetCents?: number;
  /** Skip contracts cheaper than this (the budget's minimum). */
  minBudgetCents?: number;
  /** Keep only contracts this accepts (e.g. not risky). Checked before the limit. */
  accept?: (c: FoundContract) => boolean;
  /** How many of the best two-skin contracts to try a third skin in. */
  mixDepth?: number;
  /** How many of the cheapest options to try as fillers. */
  fillerPool?: number;
  limit?: number;
};

/**
 * Tries k target inputs (1..N) with N-k filler inputs for every target option and the
 * cheapest filler options. Fillers can be any collection with outcomes, and low-float
 * fillers pull the average float down. Avoids testing every combination of every skin.
 */
export function findContracts(
  options: readonly InputOption[],
  outcomesByCollection: ReadonlyMap<string, readonly OutcomeSkin[]>,
  price: PriceFn,
  opts: FinderOptions,
): FoundContract[] {
  const n = inputCount(opts.tier);
  const usable = options.filter(
    (o) => outcomesByCollection.get(o.collectionId)?.length,
  );
  // Cheapest market options, plus everything the user owns (always worth trying).
  const fillers = [
    ...[...usable]
      .filter((o) => !o.owned)
      .sort((a, b) => a.costCents - b.costCents)
      .slice(0, opts.fillerPool ?? 30),
    ...usable.filter((o) => o.owned),
  ];
  const found = new Map<string, FoundContract>();

  type Part = { option: InputOption; count: number };
  const tryParts = (parts: Part[]) => {
    // Can't use 10 of something with only 3 listed (or 3 owned).
    if (parts.some((p) => p.count < 1 || p.count > p.option.quantity)) return;
    const key = parts
      .map(
        (p) =>
          `${p.count}x${p.option.owned ? "owned:" : ""}${p.option.marketHashName}`,
      )
      .sort()
      .join("+");
    if (found.has(key)) return;
    const inputs = parts.flatMap((p) =>
      Array<InputOption>(p.count).fill(p.option),
    );
    try {
      const result = evaluateContract(
        opts.tier,
        inputs,
        outcomesByCollection,
        price,
        opts.market,
      );
      found.set(key, { key, inputs: parts, result });
    } catch (err) {
      if (!(err instanceof ContractError)) throw err;
    }
  };

  for (const target of usable) {
    tryParts([{ option: target, count: n }]);
    for (const filler of fillers) {
      if (filler === target) continue;
      for (let k = 1; k < n; k++)
        tryParts([
          { option: target, count: k },
          { option: filler, count: n - k },
        ]);
    }
  }

  // Three-skin mixes: take the best two-skin contracts and move some of the filler slots
  // to a third skin, often from another collection. Mixing collections changes the odds
  // (pool model) and the average float, which is how traders tune a contract.
  const best = [...found.values()]
    .filter((c) => c.inputs.length === 2 && (opts.accept?.(c) ?? true))
    .sort((a, b) => b.result.profitCents - a.result.profitCents)
    .slice(0, opts.mixDepth ?? 40);
  const thirds = fillers.slice(0, 15);
  for (const c of best) {
    const [a, b] = c.inputs;
    for (const third of thirds) {
      if (third === a.option || third === b.option) continue;
      for (let m = 1; m < b.count; m++)
        tryParts([
          a,
          { ...b, count: b.count - m },
          { option: third, count: m },
        ]);
      for (let m = 1; m < a.count; m++)
        tryParts([
          { ...a, count: a.count - m },
          b,
          { option: third, count: m },
        ]);
    }
  }

  // Budget is checked last: an over-budget two-skin mix can still seed a cheaper three-skin one.
  const inBudget = (c: FoundContract) =>
    (opts.budgetCents == null || c.result.costCents <= opts.budgetCents) &&
    (opts.minBudgetCents == null || c.result.costCents >= opts.minBudgetCents);
  return [...found.values()]
    .filter((c) => inBudget(c) && (opts.accept?.(c) ?? true))
    .sort((a, b) => b.result.profitCents - a.result.profitCents)
    .slice(0, opts.limit ?? 100);
}
