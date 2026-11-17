"use client";

import Image from "next/image";
import { useState } from "react";
import type { Deal } from "@/lib/deals";
import type { SteamPrice } from "@/lib/prices/steam";
import { MARKETPLACES, steamNet, type MarketplaceId } from "@/lib/fees";
import { useMoney } from "./Money";
import { PriceHistory, TrendBadge } from "./PriceHistory";

export function Deals() {
  const { money, rates, currency } = useMoney();
  const [market, setMarket] = useState<MarketplaceId>("skinport");
  const [minDiscount, setMinDiscount] = useState("10");
  const [minVolume, setMinVolume] = useState("10");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");
  const [weapons, setWeapons] = useState(true);
  const [dips, setDips] = useState(false);
  const [chart, setChart] = useState<{ name: string; version: string } | null>(
    null,
  );
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    deals?: Deal[];
  }>({ loading: false });

  async function scan() {
    setState({ loading: true });
    try {
      const usdMax = max ? Number(max) / (rates[currency] ?? 1) : 0;
      const params = new URLSearchParams({
        market,
        minDiscount,
        minVolume,
        max: String(usdMax || ""),
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
      set(e.target.value.replace(/[^\d.]/g, ""));

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

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted">Search</span>
          <input
            className="input w-44"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Any item"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Resell on</span>
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
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Min % below usual</span>
          <input
            className="input w-20"
            inputMode="decimal"
            value={minDiscount}
            onChange={num(setMinDiscount)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Min sold in 30 days</span>
          <input
            className="input w-20"
            inputMode="numeric"
            value={minVolume}
            onChange={num(setMinVolume)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Max price ({currency})</span>
          <input
            className="input w-24"
            inputMode="decimal"
            value={max}
            onChange={num(setMax)}
            placeholder="Any"
          />
        </label>
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
        <button
          className="btn-primary"
          disabled={state.loading}
          onClick={() => void scan()}
        >
          {state.loading ? "Scanning..." : "Find deals"}
        </button>
      </div>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.deals?.length === 0 && (
        <p className="text-sm text-muted">
          No deals right now. Lower the minimums, or update prices on the
          Dashboard.
        </p>
      )}

      {state.deals && state.deals.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="p-2 font-normal">Item</th>
                <th className="p-2 font-normal">Buy now</th>
                <th className="p-2 font-normal">Usually</th>
                <th className="p-2 font-normal">Below</th>
                <th className="p-2 font-normal">Sold 30d</th>
                <th className="p-2 font-normal">Flip profit</th>
                <th className="p-2 font-normal">Steam</th>
              </tr>
            </thead>
            <tbody>
              {state.deals.map((d) => (
                <tr
                  key={`${d.marketHashName}|${d.version}`}
                  className="border-t border-line"
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
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
                        <a
                          className="hover:underline"
                          href={`https://skinport.com/market?search=${encodeURIComponent(d.marketHashName)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.marketHashName}
                          {d.version ? ` (${d.version})` : ""}
                        </a>
                        <TrendBadge trend={d.trend} />
                        <button
                          className="ml-2 text-xs text-accent underline"
                          onClick={() =>
                            setChart({
                              name: d.marketHashName,
                              version: d.version,
                            })
                          }
                        >
                          Chart
                        </button>
                      </span>
                    </div>
                  </td>
                  <td className="p-2">{money(d.buyCents)}</td>
                  <td className="p-2">{money(d.usualCents)}</td>
                  <td className="p-2">{Math.round(d.discount * 100)}%</td>
                  <td className="p-2">{d.volume30d}</td>
                  <td className="p-2 font-medium text-good">
                    {money(d.flipProfitCents)}
                  </td>
                  <td className="p-2">
                    <SteamCheck name={d.marketHashName} buyCents={d.buyCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chart && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Price history: ${chart.name}`}
          className="fixed inset-0 z-10 flex justify-end bg-black/60"
          onClick={() => setChart(null)}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-panel p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn float-right"
              onClick={() => setChart(null)}
              autoFocus
            >
              Close
            </button>
            <h2 className="mb-3 text-lg font-semibold">
              {chart.name}
              {chart.version ? ` (${chart.version})` : ""}
            </h2>
            <PriceHistory name={chart.name} version={chart.version} />
          </div>
        </div>
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
      <button className="text-accent underline" onClick={() => void check()}>
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
