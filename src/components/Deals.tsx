"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Deal } from "@/lib/deals";
import type { SteamPrice } from "@/lib/prices/steam";
import {
  isMarketplaceId,
  MARKETPLACES,
  steamNet,
  type MarketplaceId,
} from "@/lib/fees";
import { useMoney } from "./Money";
import { AskAi } from "./AskAi";
import { useSearchParams } from "next/navigation";
import { urlFlag, urlNumber } from "@/lib/filters";
import { PriceHistory, TrendBadge } from "./PriceHistory";
import { Field, Modal, numeric, SkinName, SortTh, useSort } from "./ui";

const DEAL_COLUMNS = {
  name: (d: Deal) => d.marketHashName,
  buy: (d: Deal) => d.buyCents,
  usual: (d: Deal) => d.usualCents,
  below: (d: Deal) => d.discount,
  sold: (d: Deal) => d.volume30d,
  listed: (d: Deal) => d.quantity,
  steam: (d: Deal) => MARKETPLACES.steam.net(d.usualCents),
  skinport: (d: Deal) => MARKETPLACES.skinport.net(d.usualCents),
  csfloat: (d: Deal) => MARKETPLACES.csfloat.net(d.usualCents),
  profit: (d: Deal) => d.flipProfitCents,
  roi: (d: Deal) => d.flipProfitCents / d.buyCents,
};

export function Deals() {
  const { money, rates, currency } = useMoney();
  // Filters can arrive in the URL from the Dashboard's plain-English search.
  const params = useSearchParams();
  const [market, setMarket] = useState<MarketplaceId>(() => {
    const m = params.get("market");
    return m && isMarketplaceId(m) ? m : "skinport";
  });
  const [minDiscount, setMinDiscount] = useState(() =>
    urlNumber(params, "minDiscount", "10"),
  );
  const [minVolume, setMinVolume] = useState(() =>
    urlNumber(params, "minVolume", "10"),
  );
  const [max, setMax] = useState(() => urlNumber(params, "max", ""));
  const [min, setMin] = useState(() => urlNumber(params, "min", ""));
  const [q, setQ] = useState(() => params.get("q")?.slice(0, 100) ?? "");
  const [weapons, setWeapons] = useState(() =>
    urlFlag(params, "weapons", true),
  );
  const [dips, setDips] = useState(() => urlFlag(params, "dips", false));
  const [chart, setChart] = useState<Deal | null>(null);
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    deals?: Deal[];
  }>({ loading: false });

  async function scan() {
    setState({ loading: true });
    try {
      const usd = (v: string) => (v ? Number(v) / (rates[currency] ?? 1) : 0);
      const params = new URLSearchParams({
        market,
        minDiscount,
        minVolume,
        max: String(usd(max) || ""),
        min: String(usd(min) || ""),
        q,
        weapons: weapons ? "1" : "0",
        dips: dips ? "1" : "0",
      });
      const res = await fetch(`/api/deals?${params}`);
      const json = (await res.json()) as { error?: string; deals?: Deal[] };
      if (!res.ok) throw new Error(json.error ?? "Scan failed.");
      setState({ loading: false, deals: json.deals });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Scan failed.",
      });
    }
  }

  const num =
    (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
      set(numeric(e.target.value));
  const rows = useMemo(() => state.deals ?? [], [state.deals]);
  const sort = useSort(rows, DEAL_COLUMNS, "profit");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Deals</h1>
        <p className="text-sm text-muted">
          Skins listed on Skinport for less than they usually sell for (their
          30-day median), that sell often enough to flip. Profit is what you
          keep after reselling at the usual price and paying the fee.
        </p>
      </div>

      {params.size > 0 && !state.deals && (
        <p role="status" className="panel border-accent p-3 text-sm">
          Filters set from your search. Check them, then click{" "}
          <strong>Find deals</strong>.
        </p>
      )}

      <form
        className="panel grid grid-cols-2 items-end gap-3 p-3 sm:grid-cols-4 lg:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void scan();
        }}
      >
        <Field label="Search" className="col-span-2 sm:col-span-1">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Any item"
          />
        </Field>
        <Field label="Resell on">
          <select
            className="input"
            value={market}
            onChange={(e) => setMarket(e.target.value as MarketplaceId)}
          >
            {Object.values(MARKETPLACES).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Min price (${currency})`}>
          <input
            className="input"
            inputMode="decimal"
            value={min}
            onChange={num(setMin)}
            placeholder="0"
          />
        </Field>
        <Field label={`Max price (${currency})`}>
          <input
            className="input"
            inputMode="decimal"
            value={max}
            onChange={num(setMax)}
            placeholder="Any"
          />
        </Field>
        <Field label="Min % below usual">
          <input
            className="input"
            inputMode="decimal"
            value={minDiscount}
            onChange={num(setMinDiscount)}
          />
        </Field>
        <Field label="Min sold in 30 days">
          <input
            className="input"
            inputMode="numeric"
            value={minVolume}
            onChange={num(setMinVolume)}
          />
        </Field>
        <button className="btn-primary h-[34px]" disabled={state.loading}>
          {state.loading ? "Scanning..." : "Find deals"}
        </button>
        <div className="col-span-full flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={weapons}
              onChange={(e) => setWeapons(e.target.checked)}
            />
            Weapon skins only
          </label>
          <label
            className="flex items-center gap-2"
            title="Short drops against a steady long-term price, which tend to correct"
          >
            <input
              type="checkbox"
              checked={dips}
              onChange={(e) => setDips(e.target.checked)}
            />
            Dips only
          </label>
        </div>
      </form>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.deals?.length === 0 && (
        <p className="text-sm text-muted">
          No deals right now. Lower the minimums, or update prices on the
          Dashboard.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {rows.length} deals. Click a column to sort, click an item for its
            price chart. Resale columns assume selling at the usual price.
          </p>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <SortTh k="name" sort={sort}>
                    Item
                  </SortTh>
                  <SortTh k="buy" sort={sort}>
                    Buy now
                  </SortTh>
                  <SortTh
                    k="usual"
                    sort={sort}
                    title="Median sale price over the last 30 days"
                  >
                    Usually
                  </SortTh>
                  <SortTh k="below" sort={sort}>
                    Below
                  </SortTh>
                  <SortTh k="sold" sort={sort}>
                    Sold 30d
                  </SortTh>
                  <SortTh
                    k="listed"
                    sort={sort}
                    title="Listings on Skinport right now"
                    className="hidden lg:table-cell"
                  >
                    Listed
                  </SortTh>
                  <SortTh
                    k="steam"
                    sort={sort}
                    title="What you keep selling at the usual price on Steam (about 13% fee)"
                    className="hidden xl:table-cell"
                  >
                    After Steam
                  </SortTh>
                  <SortTh
                    k="skinport"
                    sort={sort}
                    title="What you keep selling at the usual price on Skinport (8% fee)"
                    className="hidden xl:table-cell"
                  >
                    After Skinport
                  </SortTh>
                  <SortTh
                    k="csfloat"
                    sort={sort}
                    title="What you keep selling at the usual price on CSFloat (2% fee)"
                    className="hidden xl:table-cell"
                  >
                    After CSFloat
                  </SortTh>
                  <SortTh
                    k="profit"
                    sort={sort}
                    title="Resale after the chosen market's fee, minus what you pay"
                  >
                    Flip profit
                  </SortTh>
                  <SortTh k="roi" sort={sort} className="hidden md:table-cell">
                    ROI
                  </SortTh>
                  <th className="p-2 font-normal whitespace-nowrap">
                    Steam now
                  </th>
                </tr>
              </thead>
              <tbody>
                {sort.sorted.map((d) => (
                  <tr
                    key={`${d.marketHashName}|${d.version}`}
                    className="cursor-pointer border-t border-line hover:bg-bg"
                    onClick={() => setChart(d)}
                  >
                    <td className="p-2">
                      <button
                        className="flex items-center gap-2 text-left hover:underline"
                        onClick={() => setChart(d)}
                        title="Show price chart"
                      >
                        {d.image && (
                          <Image
                            src={d.image}
                            alt=""
                            width={64}
                            height={48}
                            className="h-8 w-auto"
                          />
                        )}
                        <span>
                          <SkinName name={d.marketHashName} rarity={d.rarity} />
                          {d.version ? ` (${d.version})` : ""}
                          <TrendBadge trend={d.trend} />
                        </span>
                      </button>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {money(d.buyCents)}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {money(d.usualCents)}
                    </td>
                    <td className="p-2">{Math.round(d.discount * 100)}%</td>
                    <td className="p-2">{d.volume30d}</td>
                    <td className="hidden p-2 lg:table-cell">{d.quantity}</td>
                    <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                      {money(MARKETPLACES.steam.net(d.usualCents))}
                    </td>
                    <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                      {money(MARKETPLACES.skinport.net(d.usualCents))}
                    </td>
                    <td className="hidden p-2 whitespace-nowrap xl:table-cell">
                      {money(MARKETPLACES.csfloat.net(d.usualCents))}
                    </td>
                    <td className="p-2 font-medium whitespace-nowrap text-good">
                      {money(d.flipProfitCents)}
                    </td>
                    <td className="hidden p-2 text-good md:table-cell">
                      {Math.round((d.flipProfitCents / d.buyCents) * 100)}%
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <SteamCheck
                        name={d.marketHashName}
                        buyCents={d.buyCents}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {chart && (
        <Modal
          onClose={() => setChart(null)}
          title={
            <SkinName
              name={`${chart.marketHashName}${chart.version ? ` (${chart.version})` : ""}`}
              rarity={chart.rarity}
            />
          }
        >
          <PriceHistory name={chart.marketHashName} version={chart.version} />
          <div className="mt-4">
            <AskAi topic="deal" data={chart} />
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Looks up the Steam price for one item on click (Steam limits how often we can ask). */
function SteamCheck({ name, buyCents }: { name: string; buyCents: number }) {
  const { money } = useMoney();
  const [state, setState] = useState<{
    loading?: boolean;
    error?: string;
    price?: SteamPrice;
  } | null>(null);

  async function check() {
    setState({ loading: true });
    try {
      const res = await fetch(
        `/api/steam-price?name=${encodeURIComponent(name)}`,
      );
      const json = (await res.json()) as SteamPrice & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Steam didn't answer.");
      setState({ price: json });
    } catch (err) {
      setState({
        error: err instanceof Error ? err.message : "Steam didn't answer.",
      });
    }
  }

  if (!state)
    return (
      <button
        className="text-accent underline"
        onClick={(e) => {
          e.stopPropagation();
          void check();
        }}
      >
        Check
      </button>
    );
  if (state.loading) return <span className="text-muted">...</span>;
  if (state.error || !state.price)
    return <span className="text-bad">{state.error}</span>;
  const lowest = state.price.lowestCents;
  if (lowest == null) return <span className="text-muted">Not listed</span>;
  // Undercut the lowest Steam listing by a cent, then Steam takes its fees.
  const profit = steamNet(lowest - 1) - buyCents;
  return (
    <span title={`${state.price.volume24h} sold on Steam in 24 h`}>
      {money(lowest)}{" "}
      <span className={profit > 0 ? "text-good" : "text-bad"}>
        ({profit > 0 ? "+" : ""}
        {money(profit)} on Steam)
      </span>
    </span>
  );
}
