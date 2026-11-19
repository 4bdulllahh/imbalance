"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { FoundContract } from "@/lib/finder";
import type { Outcome } from "@/lib/tradeup";
import { isTier, nextTier, TIERS, type Tier } from "@/lib/tradeup";
import { isMarketplaceId, MARKETPLACES, type MarketplaceId } from "@/lib/fees";
import { riskNotes, THIN_MARKET } from "@/lib/risk";
import { RARITY_COLORS } from "@/lib/rarity";
import { useMoney } from "./Money";
import { useSearchParams } from "next/navigation";
import { urlFlag, urlNumber } from "@/lib/filters";
import { AskAi } from "./AskAi";
import type { ContractTimeline } from "@/lib/timeline";
import { FloatBadges } from "./FloatBadges";
import { WEARS } from "@/lib/wear";
import { Field, Modal, numeric, SortTh, Stat, useSort } from "./ui";

const TIER_SHORT: Record<Tier, string> = {
  "Consumer Grade": "Consumer (grey)",
  "Industrial Grade": "Industrial (light blue)",
  "Mil-Spec Grade": "Mil-Spec (blue)",
  Restricted: "Restricted (purple)",
  Classified: "Classified (pink)",
  Covert: "Covert (red) to knife",
};

type ApiOutcome = Outcome & { volume30d: number };
type ApiContract = Omit<FoundContract, "result"> & {
  timeline: ContractTimeline;
  risky: boolean;
  grossEvCents: number;
  evByMarket: Record<MarketplaceId, number>;
  bestCents: number;
  worstCents: number;
  result: Omit<FoundContract["result"], "outcomes"> & {
    outcomes: ApiOutcome[];
  };
};
type Scan = { tier: Tier; market: MarketplaceId; contracts: ApiContract[] };

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
const tone = (cents: number) => (cents >= 0 ? "text-good" : "text-bad");
const colorOf = (t: Tier | "Rare") => RARITY_COLORS[t];

const contractRisks = (c: ApiContract) =>
  riskNotes(c.result.outcomes, c.result.evCents);

const COLUMNS = {
  inputs: (c: ApiContract) => c.inputs[0].option.skinName,
  cost: (c: ApiContract) => c.result.costCents,
  ev: (c: ApiContract) => c.result.evCents,
  gross: (c: ApiContract) => c.grossEvCents,
  steam: (c: ApiContract) => c.evByMarket.steam,
  skinport: (c: ApiContract) => c.evByMarket.skinport,
  csfloat: (c: ApiContract) => c.evByMarket.csfloat,
  profit: (c: ApiContract) => c.result.profitCents,
  roi: (c: ApiContract) => c.result.roiPercent,
  odds: (c: ApiContract) => c.result.oddsToProfit,
  best: (c: ApiContract) => c.bestCents,
  worst: (c: ApiContract) => c.worstCents,
  days: (c: ApiContract) => c.timeline.totalDays,
  risk: (c: ApiContract) => (c.risky ? 1 : 0),
};

export function TradeUps() {
  const { money, rates, currency } = useMoney();
  // Filters can arrive in the URL from the Dashboard's plain-English search.
  const params = useSearchParams();
  const [tier, setTier] = useState<Tier>(() => {
    const t = params.get("tier");
    return t && isTier(t) ? t : "Restricted";
  });
  const [stattrak, setStattrak] = useState(() =>
    urlFlag(params, "stattrak", false),
  );
  const [market, setMarket] = useState<MarketplaceId>(() => {
    const m = params.get("market");
    return m && isMarketplaceId(m) ? m : "skinport";
  });
  const [minBudget, setMinBudget] = useState(() =>
    urlNumber(params, "min", ""),
  );
  const [budget, setBudget] = useState(() => urlNumber(params, "max", ""));
  const [hideRisky, setHideRisky] = useState(() =>
    urlFlag(params, "hideRisky", true),
  );
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    scan?: Scan;
  }>({ loading: false });
  const [selected, setSelected] = useState<ApiContract | null>(null);
  const rows = useMemo(() => state.scan?.contracts ?? [], [state.scan]);
  const sort = useSort(rows, COLUMNS, "profit");

  async function scan() {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      // Budget is typed in the shown currency; the server works in USD.
      const usd = (v: string) => (v ? Number(v) / (rates[currency] ?? 1) : 0);
      const q = new URLSearchParams({
        tier,
        market,
        stattrak: stattrak ? "1" : "0",
        hideRisky: hideRisky ? "1" : "0",
        budget: String(usd(budget) || ""),
        minBudget: String(usd(minBudget) || ""),
      });
      const res = await fetch(`/api/tradeups?${q}`);
      const json = (await res.json()) as {
        error?: string;
        contracts?: ApiContract[];
      };
      if (!res.ok) throw new Error(json.error ?? "Scan failed.");
      setState({
        loading: false,
        scan: { tier, market, contracts: json.contracts ?? [] },
      });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Scan failed.",
      });
    }
  }

  const scanTier = state.scan?.tier ?? tier;
  const scanMarket = MARKETPLACES[state.scan?.market ?? market];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Trade-ups</h1>
        <p className="text-sm text-muted">
          Set your filters, scan, and see which contracts pay after fees. Mixes
          can use up to three different skins and collections. Inputs assume the
          worst float of their wear, so lower floats only make it better.
        </p>
      </div>

      {params.size > 0 && !state.scan && (
        <p role="status" className="panel border-accent p-3 text-sm">
          Filters set from your search. Check them, then click{" "}
          <strong>Scan</strong>.
        </p>
      )}

      <form
        className="panel grid grid-cols-2 items-end gap-3 p-3 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1.2fr_0.8fr_0.8fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void scan();
        }}
      >
        <Field label="Rarity to put in" className="col-span-2 sm:col-span-1">
          <select
            className="input"
            value={tier}
            style={{ borderLeft: `4px solid ${colorOf(tier)}` }}
            onChange={(e) => setTier(e.target.value as Tier)}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_SHORT[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            className="input"
            value={stattrak ? "st" : "normal"}
            onChange={(e) => setStattrak(e.target.value === "st")}
          >
            <option value="normal">Normal</option>
            <option value="st">StatTrak™</option>
          </select>
        </Field>
        <Field label="Sell on">
          <select
            className="input"
            value={market}
            onChange={(e) => setMarket(e.target.value as MarketplaceId)}
          >
            {Object.values(MARKETPLACES).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.feeNote.split(" (")[0]})
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Min spend (${currency})`}>
          <input
            className="input"
            inputMode="decimal"
            value={minBudget}
            onChange={(e) => setMinBudget(numeric(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label={`Max spend (${currency})`}>
          <input
            className="input"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(numeric(e.target.value))}
            placeholder="Any"
          />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={hideRisky}
            onChange={(e) => setHideRisky(e.target.checked)}
          />
          Hide risky
        </label>
        <button className="btn-primary h-[34px]" disabled={state.loading}>
          {state.loading ? "Scanning..." : "Scan"}
        </button>
      </form>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.scan && rows.length === 0 && (
        <p className="text-sm text-muted">
          No contracts found. Update prices on the Dashboard, or widen the
          budget.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {rows.length} contracts. Click a column to sort, click a row for the
            full breakdown. Expected back and profit use {scanMarket.label}
            &apos;s fee.
          </p>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <SortTh k="inputs" sort={sort}>
                    Inputs
                  </SortTh>
                  <SortTh k="cost" sort={sort}>
                    Cost
                  </SortTh>
                  <SortTh
                    k="ev"
                    sort={sort}
                    title={`Average you get back after ${scanMarket.label}'s fee`}
                  >
                    Expected back
                  </SortTh>
                  <SortTh k="profit" sort={sort}>
                    Profit
                  </SortTh>
                  <SortTh k="roi" sort={sort}>
                    ROI
                  </SortTh>
                  <SortTh
                    k="odds"
                    sort={sort}
                    title="Chance the item you get is worth more than the cost, after fees"
                  >
                    Chance
                  </SortTh>
                  <SortTh
                    k="gross"
                    sort={sort}
                    title="Expected back before any fee"
                    className="hidden xl:table-cell"
                  >
                    No fee
                  </SortTh>
                  <SortTh
                    k="steam"
                    sort={sort}
                    title="Expected back after Steam's fee (about 13%)"
                    className="hidden xl:table-cell"
                  >
                    After Steam
                  </SortTh>
                  <SortTh
                    k="skinport"
                    sort={sort}
                    title="Expected back after Skinport's 8% fee"
                    className="hidden xl:table-cell"
                  >
                    After Skinport
                  </SortTh>
                  <SortTh
                    k="csfloat"
                    sort={sort}
                    title="Expected back after CSFloat's 2% fee"
                    className="hidden 2xl:table-cell"
                  >
                    After CSFloat
                  </SortTh>
                  <SortTh
                    k="best"
                    sort={sort}
                    title="Best item you can get, after fees"
                    className="hidden lg:table-cell"
                  >
                    Best
                  </SortTh>
                  <SortTh
                    k="worst"
                    sort={sort}
                    title="Worst item you can get, after fees"
                    className="hidden lg:table-cell"
                  >
                    Worst
                  </SortTh>
                  <SortTh
                    k="days"
                    sort={sort}
                    title="Trade hold plus expected time to sell"
                    className="hidden md:table-cell"
                  >
                    Days
                  </SortTh>
                  <SortTh k="risk" sort={sort}>
                    Risk
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sort.sorted.map((c) => {
                  const risks = contractRisks(c);
                  return (
                    <tr
                      key={c.key}
                      className="cursor-pointer border-t border-line align-middle hover:bg-bg"
                      onClick={() => setSelected(c)}
                    >
                      <td className="p-2">
                        <button
                          className="flex flex-col gap-1 text-left"
                          onClick={() => setSelected(c)}
                          aria-label="Show contract details"
                        >
                          {c.inputs.map((i) => (
                            <span
                              key={i.option.marketHashName}
                              className="flex items-center gap-2"
                            >
                              {i.option.image && (
                                <Image
                                  src={i.option.image}
                                  alt=""
                                  width={48}
                                  height={36}
                                  className="h-6 w-auto"
                                />
                              )}
                              <span className="whitespace-nowrap">
                                <span className="font-mono text-muted">
                                  {i.count}x
                                </span>{" "}
                                {i.option.owned && (
                                  <strong className="text-good">yours </strong>
                                )}
                                <span style={{ color: colorOf(scanTier) }}>
                                  {i.option.skinName}
                                </span>{" "}
                                <span
                                  className="text-muted"
                                  title={i.option.wear}
                                >
                                  {WEARS.find((w) => w.name === i.option.wear)
                                    ?.short ?? i.option.wear}
                                </span>
                              </span>
                            </span>
                          ))}
                        </button>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {money(c.result.costCents)}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {money(c.result.evCents)}
                      </td>
                      <td
                        className={`p-2 font-medium whitespace-nowrap ${tone(c.result.profitCents)}`}
                      >
                        {money(c.result.profitCents)}
                      </td>
                      <td className={`p-2 ${tone(c.result.profitCents)}`}>
                        {c.result.roiPercent.toFixed(0)}%
                      </td>
                      <td className="p-2">{pct(c.result.oddsToProfit)}</td>
                      <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                        {money(c.grossEvCents)}
                      </td>
                      <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                        {money(c.evByMarket.steam)}
                      </td>
                      <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                        {money(c.evByMarket.skinport)}
                      </td>
                      <td className="hidden p-2 whitespace-nowrap 2xl:table-cell">
                        {money(c.evByMarket.csfloat)}
                      </td>
                      <td className="hidden p-2 whitespace-nowrap text-good lg:table-cell">
                        {money(c.bestCents)}
                      </td>
                      <td className="hidden p-2 whitespace-nowrap text-bad lg:table-cell">
                        {money(c.worstCents)}
                      </td>
                      <td className="hidden p-2 md:table-cell">
                        {Math.ceil(c.timeline.totalDays)}
                      </td>
                      <td className="p-2">
                        {risks.length ? (
                          <span className="text-bad" title={risks.join(". ")}>
                            Check
                          </span>
                        ) : (
                          <span className="text-muted">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && (
        <ContractDetail
          contract={selected}
          tier={scanTier}
          market={scanMarket.id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

type OutcomeSort = "profit" | "chance" | "price";

function ContractDetail({
  contract: c,
  tier,
  market,
  onClose,
}: {
  contract: ApiContract;
  tier: Tier;
  market: MarketplaceId;
  onClose: () => void;
}) {
  const { money } = useMoney();
  const [order, setOrder] = useState<OutcomeSort>("profit");
  const risks = contractRisks(c);
  const cost = c.result.costCents;
  const outTier = nextTier(tier);
  const n = c.inputs.reduce((s, i) => s + i.count, 0);
  const avgFloat =
    c.inputs.reduce((s, i) => s + i.option.float * i.count, 0) / n;
  // No-fee versions of the headline numbers, to show what fees cost you.
  const oddsNoFee = c.result.outcomes
    .filter((o) => (o.priceCents ?? 0) > cost)
    .reduce((s, o) => s + o.probability, 0);
  const roi = (ev: number) => `${((ev / cost) * 100).toFixed(1)}%`;
  const outcomes = [...c.result.outcomes].sort((a, b) =>
    order === "chance"
      ? b.probability - a.probability
      : order === "price"
        ? (b.priceCents ?? 0) - (a.priceCents ?? 0)
        : b.netCents - a.netCents,
  );

  return (
    <Modal
      size="xl"
      onClose={onClose}
      title="Trade-up contract"
      subtitle={
        <>
          {n} {tier} skins in, one{" "}
          <span style={{ color: colorOf(outTier) }}>
            {outTier === "Rare" ? "knife or glove" : outTier}
          </span>{" "}
          out. Selling on {MARKETPLACES[market].label}.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Avg float">
          <span className="font-mono">{avgFloat.toFixed(4)}</span>
          <div className="text-xs font-normal text-muted">
            {(c.result.avgNormFloat * 100).toFixed(1)}% of range
          </div>
        </Stat>
        <Stat label="Cost" tone="bad">
          {money(cost)}
        </Stat>
        <Stat label="Expected back" tone="accent">
          {money(c.result.evCents)}
          <div className="text-xs font-normal text-muted">
            {money(c.grossEvCents)} no fee
          </div>
        </Stat>
        <Stat
          label="Profitability"
          tone={c.result.profitCents >= 0 ? "good" : "bad"}
        >
          {roi(c.result.evCents)}
          <div className="text-xs font-normal text-muted">
            {roi(c.grossEvCents)} no fee
          </div>
        </Stat>
        <Stat
          label="Profit / trade"
          tone={c.result.profitCents >= 0 ? "good" : "bad"}
        >
          <span className={tone(c.result.profitCents)}>
            {money(c.result.profitCents)}
          </span>
          <div className="text-xs font-normal text-muted">
            {money(c.grossEvCents - cost)} no fee
          </div>
        </Stat>
        <Stat label="Odds to profit">
          {pct(c.result.oddsToProfit)}
          <div className="text-xs font-normal text-muted">
            {pct(oddsNoFee)} no fee
          </div>
        </Stat>
        <Stat label="Best item" tone="good">
          {money(c.bestCents)}
        </Stat>
        <Stat label="Worst item" tone="bad">
          {money(c.worstCents)}
        </Stat>
      </div>

      <p className="mt-3 text-sm">
        Takes about <strong>{Math.ceil(c.timeline.totalDays)} days</strong>: a{" "}
        {c.timeline.holdDays}-day trade hold before you can sell what you get
        (change it on the Tracker page), then about{" "}
        {Math.ceil(c.timeline.sellDays)} days to sell it at the usual price.
      </p>
      {risks.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-bad">
          {risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-semibold">
          Outcomes{" "}
          <span className="text-sm font-normal text-muted">
            ({outcomes.length}, green pays more than the cost after fees)
          </span>
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select
            className="input"
            value={order}
            onChange={(e) => setOrder(e.target.value as OutcomeSort)}
          >
            <option value="profit">Profit: best first</option>
            <option value="chance">Chance: highest first</option>
            <option value="price">Price: highest first</option>
          </select>
        </label>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {outcomes.map((o) => (
          <OutcomeCard
            key={o.skin.id + (o.skin.phase ?? "")}
            o={o}
            cost={cost}
            color={colorOf(outTier)}
          />
        ))}
      </ul>

      <h3 className="mt-6 mb-2 font-semibold">
        Inputs{" "}
        <span className="text-sm font-normal text-muted">(buy these)</span>
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {c.inputs.map((i) => (
          <li
            key={i.option.marketHashName}
            className="relative flex flex-col rounded-lg border border-line bg-bg p-2 text-sm"
            style={{ borderTop: `3px solid ${colorOf(tier)}` }}
          >
            <span className="absolute top-1.5 right-2 rounded bg-panel px-1.5 font-mono text-xs font-semibold">
              {i.count}x
            </span>
            <span className="truncate pr-8 text-xs text-muted">
              {i.option.skinName.split(" | ")[0]}
            </span>
            <span
              className="truncate font-medium"
              style={{ color: colorOf(tier) }}
            >
              {i.option.skinName.split(" | ")[1] ?? i.option.skinName}
            </span>
            {i.option.image && (
              <Image
                src={i.option.image}
                alt=""
                width={128}
                height={96}
                className="mx-auto my-1 h-16 w-auto object-contain"
              />
            )}
            <span className="text-center text-xs text-muted">
              {i.option.wear}
            </span>
            <span className="text-center font-semibold">
              {money(i.option.costCents)}{" "}
              <span className="text-xs font-normal text-muted">each</span>
            </span>
            <span className="mt-1 text-center text-xs text-muted">
              Float up to {i.option.float.toFixed(3)}
              {i.option.owned ? " (yours)" : `, ${i.option.quantity} listed`}
            </span>
            {!i.option.owned && (
              <a
                className="mt-1 text-center text-xs text-accent hover:underline"
                href={`https://skinport.com/market?search=${encodeURIComponent(i.option.marketHashName)}`}
                target="_blank"
                rel="noreferrer"
              >
                Buy on Skinport
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <AskAi topic="contract" data={contractForAi(c, risks)} />
      </div>
    </Modal>
  );
}

function OutcomeCard({
  o,
  cost,
  color,
}: {
  o: ApiOutcome;
  cost: number;
  color: string;
}) {
  const { money } = useMoney();
  const profit = o.netCents - cost;
  const profitNoFee = (o.priceCents ?? 0) - cost;
  const [weapon, skin] = o.skin.name.includes(" | ")
    ? o.skin.name.split(" | ")
    : ["", o.skin.name];
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-lg border-2 bg-bg text-sm ${profit > 0 ? "border-good/70" : "border-bad/60"}`}
    >
      <div className="px-2 pt-2 text-center">
        <div className="truncate text-xs text-muted">{weapon}</div>
        <div className="truncate font-medium" style={{ color }}>
          {skin}
          {o.skin.phase ? ` ${o.skin.phase}` : ""}
        </div>
      </div>
      {o.skin.image && (
        <Image
          src={o.skin.image}
          alt=""
          width={128}
          height={96}
          className="mx-auto my-1 h-16 w-auto object-contain"
        />
      )}
      <div className="px-2 text-center text-xs text-muted">
        {o.wear ?? "No wear"}{" "}
        <span className="font-mono">{o.float.toFixed(4)}</span>
        <FloatBadges
          float={o.float}
          min={o.skin.minFloat}
          max={o.skin.maxFloat}
        />
      </div>
      <div className="px-2 pb-1 text-center text-base font-semibold">
        {money(o.priceCents)}
      </div>
      <div className="mt-auto grid grid-cols-[1fr_auto] border-t border-line text-xs">
        <div className="space-y-0.5 p-1.5">
          <div className={tone(profit)} title="Profit after the fee">
            {profit >= 0 ? "+" : ""}
            {money(profit)} <span className="text-muted">fees</span>
          </div>
          <div className={tone(profitNoFee)} title="Profit before any fee">
            {profitNoFee >= 0 ? "+" : ""}
            {money(profitNoFee)} <span className="text-muted">no fee</span>
          </div>
        </div>
        <div className="flex items-center border-l border-line px-2 font-semibold text-accent">
          {pct(o.probability)}
        </div>
      </div>
      <div
        className={`border-t border-line px-2 py-1 text-center text-[11px] ${o.volume30d < THIN_MARKET ? "text-bad" : "text-muted"}`}
      >
        {o.volume30d} sold in 30 days
        {o.betterWear && (
          <span className="block text-muted">
            {o.betterWear.wear} under{" "}
            {(o.betterWear.maxAvgNorm * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </li>
  );
}

/** The computed facts about a contract, compact, for the AI to comment on. */
function contractForAi(c: ApiContract, risks: string[]) {
  return {
    costCents: c.result.costCents,
    expectedValueAfterFeesCents: c.result.evCents,
    profitCents: c.result.profitCents,
    roiPercent: Math.round(c.result.roiPercent),
    chanceToProfit: c.result.oddsToProfit,
    days: c.timeline,
    warnings: risks,
    inputs: c.inputs.map((i) => ({
      count: i.count,
      item: i.option.marketHashName,
      eachCents: i.option.costCents,
      owned: Boolean(i.option.owned),
    })),
    outcomes: c.result.outcomes.map((o) => ({
      item: o.skin.name,
      wear: o.wear,
      float: Number(o.float.toFixed(4)),
      probability: Number(o.probability.toFixed(3)),
      sellCents: o.priceCents,
      afterFeeCents: o.netCents,
      sales30d: o.volume30d,
    })),
  };
}
