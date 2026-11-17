"use client";

import { useEffect, useState } from "react";
import type { HistoryPoint, TrendSignal } from "@/lib/trend";
import { TREND_LABELS } from "@/lib/trend";
import { useMoney } from "./Money";

type History = {
  points: HistoryPoint[];
  nowCents: number | null;
  median24h: number | null;
  median7d: number | null;
  median30d: number | null;
  median90d: number | null;
  volumes: { d1: number; d7: number; d30: number; d90: number };
  trend: TrendSignal;
  error?: string;
};

const TREND_TONE: Record<TrendSignal, string> = {
  dip: "text-good",
  rebounding: "text-good",
  falling: "text-bad",
  rising: "text-text",
  stable: "text-muted",
  unknown: "text-muted",
};

export function TrendBadge({ trend }: { trend: TrendSignal }) {
  if (trend === "stable" || trend === "unknown") return null;
  return (
    <span
      className={`ml-2 rounded border border-current px-1.5 text-xs ${TREND_TONE[trend]}`}
      title={TREND_LABELS[trend]}
    >
      {trend}
    </span>
  );
}

/** Price chart and sales medians for one market item. */
export function PriceHistory({
  name,
  version = "",
}: {
  name: string;
  version?: string;
}) {
  const { money } = useMoney();
  const [h, setH] = useState<History | null>(null);

  useEffect(() => {
    fetch(`/api/history?${new URLSearchParams({ name, version })}`)
      .then((r) => r.json() as Promise<History>)
      .then(setH)
      .catch(() => setH(null));
  }, [name, version]);

  if (!h) return <p className="text-sm text-muted">Loading history...</p>;
  if (h.error) return <p className="text-sm text-bad">{h.error}</p>;

  const rows = [
    { label: "Last 24 h", cents: h.median24h, sold: h.volumes.d1 },
    { label: "Last 7 days", cents: h.median7d, sold: h.volumes.d7 },
    { label: "Last 30 days", cents: h.median30d, sold: h.volumes.d30 },
    { label: "Last 90 days", cents: h.median90d, sold: h.volumes.d90 },
  ];

  return (
    <div className="space-y-3">
      <p className={`text-sm font-medium ${TREND_TONE[h.trend]}`}>
        {TREND_LABELS[h.trend]}
      </p>
      <LineChart points={h.points} median30d={h.median30d} money={money} />
      <table className="w-full text-sm">
        <caption className="sr-only">Median sale price by period</caption>
        <thead className="text-left text-muted">
          <tr>
            <th className="py-1 font-normal">Period</th>
            <th className="font-normal">Median sale</th>
            <th className="font-normal">Sold</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line">
            <td className="py-1">Cheapest listing now</td>
            <td>{money(h.nowCents)}</td>
            <td />
          </tr>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <td className="py-1">{r.label}</td>
              <td>{money(r.cents)}</td>
              <td>{r.sold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const W = 480;
const H = 160;
const PAD = { top: 12, right: 12, bottom: 20, left: 12 };

/** One series (cheapest listing over time) with the 30-day median as a dashed guide. */
function LineChart({
  points,
  median30d,
  money,
}: {
  points: HistoryPoint[];
  median30d: number | null;
  money: (c: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="rounded-md border border-dashed border-line p-3 text-sm text-muted">
        The chart fills in as Imbalance saves prices (every 6 hours while you
        update prices). The sales medians below work right away.
      </p>
    );
  }

  const values = points.map((p) => p.cents).concat(median30d ?? []);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const t0 = points[0].at;
  const t1 = points[points.length - 1].at;
  const x = (at: number) =>
    PAD.left + ((at - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (c: number) =>
    PAD.top + (1 - (c - lo) / span) * (H - PAD.top - PAD.bottom);
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.cents).toFixed(1)}`,
    )
    .join("");
  const date = (at: number) =>
    new Date(at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const hp = hover == null ? null : points[hover];

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const at = t0 + ((e.clientX - box.left) / box.width) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < points.length; i++)
      if (Math.abs(points[i].at - at) < Math.abs(points[best].at - at))
        best = i;
    setHover(best);
  }

  return (
    <figure className="relative">
      <figcaption className="mb-1 text-sm font-medium">
        Cheapest listing over time
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Price from ${money(points[0].cents)} to ${money(points[points.length - 1].cents)}`}
      >
        {median30d != null && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(median30d)}
              y2={y(median30d)}
              stroke="var(--muted)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={W - PAD.right}
              y={Math.min(y(median30d) + 12, H - PAD.bottom - 2)}
              textAnchor="end"
              fontSize={10}
              fill="var(--muted)"
            >
              30-day median {money(median30d)}
            </text>
          </g>
        )}
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text x={PAD.left} y={H - 4} fontSize={10} fill="var(--muted)">
          {date(t0)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 4}
          fontSize={10}
          fill="var(--muted)"
          textAnchor="end"
        >
          {date(t1)}
        </text>
        {hp && (
          <g>
            <line
              x1={x(hp.at)}
              x2={x(hp.at)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--muted)"
              strokeWidth={1}
            />
            <circle
              cx={x(hp.at)}
              cy={y(hp.cents)}
              r={4}
              fill="var(--accent)"
              stroke="var(--panel)"
              strokeWidth={2}
            />
          </g>
        )}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hp && (
        <div className="pointer-events-none absolute top-6 left-2 rounded border border-line bg-panel px-2 py-1 text-xs shadow">
          {new Date(hp.at).toLocaleString()}: <strong>{money(hp.cents)}</strong>
        </div>
      )}
    </figure>
  );
}
