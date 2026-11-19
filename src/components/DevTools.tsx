"use client";

import { useCallback, useEffect, useState } from "react";
import type { ErrorLog, RequestLog } from "@/lib/limiter";
import { clientErrors, type ClientError } from "./Background";

type Debug = {
  app: { version: string; next: string };
  runtime: Record<string, string | number | undefined>;
  database: {
    schema: number;
    expected: number;
    dbBytes: number | null;
    tables: { name: string; rows: number }[];
  };
  status: Record<string, number | null>;
  keys: Record<string, boolean>;
  limits: Record<string, number>;
  requests: RequestLog[];
  errors: ErrorLog[];
};
type Check = { route: string; ms: number; status: number | string };

const CHECKS = [
  "/api/status",
  "/api/currency",
  "/api/skins?page=1",
  "/api/deals?minDiscount=10&minVolume=10",
  "/api/tradeups?tier=Restricted&market=skinport",
];

const time = (at: number) => new Date(at).toLocaleTimeString();

/** Plain text for pasting into a chat with Claude: no keys, only whether each is set. */
function report(d: Debug, client: ClientError[], checks: Check[]) {
  const lines = [
    "## Imbalance debug report",
    `Generated ${new Date().toISOString()} on ${location.pathname}`,
    `App ${d.app.version}, Next ${d.app.next}, Node ${d.runtime.node}, ${d.runtime.platform}, mode ${d.runtime.mode}, up ${d.runtime.uptimeMin} min, ${d.runtime.memoryMb} MB`,
    `Browser: ${navigator.userAgent}, window ${innerWidth}x${innerHeight}`,
    `DB schema ${d.database.schema} (code expects ${d.database.expected}), file ${d.database.dbBytes ?? "?"} bytes`,
    `Tables: ${d.database.tables.map((t) => `${t.name}=${t.rows}`).join(", ")}`,
    `Status: ${JSON.stringify(d.status)}`,
    `Keys set: ${JSON.stringify(d.keys)}`,
    `Limits: ${JSON.stringify(d.limits)}`,
    "",
    "### Health checks",
    ...(checks.length
      ? checks.map((c) => `- ${c.route}: ${c.status} in ${c.ms} ms`)
      : ["(not run)"]),
    "",
    "### Server errors (newest first)",
    ...(d.errors.length
      ? d.errors.map((e) => `- ${time(e.at)} [${e.where}] ${e.message}`)
      : ["(none)"]),
    "",
    "### Browser errors (newest first)",
    ...(client.length
      ? [...client]
          .reverse()
          .map((e) => `- ${time(e.at)} [${e.where}] ${e.message}`)
      : ["(none)"]),
    "",
    "### Outside API calls (newest first, last 30)",
    ...(d.requests.length
      ? d.requests
          .slice(0, 30)
          .map(
            (r) =>
              `- ${time(r.at)} ${r.host}${r.path} -> ${r.status ?? "failed"} in ${r.ms} ms${r.error ? ` (${r.error})` : ""}`,
          )
      : ["(none)"]),
  ];
  return lines.join("\n");
}

export function DevTools() {
  const [d, setD] = useState<Debug | null>(null);
  const [client, setClient] = useState<ClientError[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/debug");
      setD((await res.json()) as Debug);
      setClient([...clientErrors()]);
      setErr(null);
    } catch {
      setErr("Could not reach the app server. Is npm start still running?");
    }
  }, []);

  useEffect(() => {
    // Polls every few seconds so new calls and errors show up while you click around.
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  async function runChecks() {
    setChecking(true);
    const out: Check[] = [];
    for (const route of CHECKS) {
      const t = performance.now();
      try {
        const r = await fetch(route);
        await r.text();
        out.push({
          route,
          ms: Math.round(performance.now() - t),
          status: r.status,
        });
      } catch (e) {
        out.push({
          route,
          ms: Math.round(performance.now() - t),
          status: e instanceof Error ? e.message : "failed",
        });
      }
      setChecks([...out]);
    }
    setChecking(false);
  }

  async function copy() {
    if (!d) return;
    await navigator.clipboard.writeText(report(d, clientErrors(), checks));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function clear() {
    await fetch("/api/debug", { method: "POST" });
    clientErrors().length = 0;
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dev tools</h1>
          <p className="text-sm text-muted">
            For troubleshooting. Copy the report and paste it to Claude: it has
            versions, errors and API calls, never your keys.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={!d}
            onClick={() => void copy()}
          >
            {copied ? "Copied" : "Copy report for Claude"}
          </button>
          <button
            className="btn"
            disabled={checking}
            onClick={() => void runChecks()}
          >
            {checking ? "Checking..." : "Run health checks"}
          </button>
          <button className="btn" onClick={() => void clear()}>
            Clear logs
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-bad">{err}</p>}
      {!d ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Box title="App">
              <Row k="Version" v={d.app.version} />
              <Row k="Next.js" v={d.app.next} />
              {Object.entries(d.runtime).map(([k, v]) => (
                <Row key={k} k={k} v={String(v)} />
              ))}
            </Box>
            <Box title="Database">
              <Row
                k="Schema"
                v={`${d.database.schema} of ${d.database.expected}`}
                bad={d.database.schema !== d.database.expected}
              />
              <Row
                k="Size"
                v={
                  d.database.dbBytes == null
                    ? "?"
                    : `${(d.database.dbBytes / 1e6).toFixed(1)} MB`
                }
              />
              {d.database.tables.map((t) => (
                <Row key={t.name} k={t.name} v={t.rows.toLocaleString()} />
              ))}
            </Box>
            <Box title="Keys and limits">
              {Object.entries(d.keys).map(([k, v]) => (
                <Row key={k} k={k} v={v ? "set" : "not set"} />
              ))}
              {Object.entries(d.limits).map(([k, v]) => (
                <Row key={k} k={k} v={String(v)} />
              ))}
            </Box>
          </div>

          {checks.length > 0 && (
            <Box title="Health checks">
              {checks.map((c) => (
                <Row
                  key={c.route}
                  k={c.route}
                  v={`${c.status} in ${c.ms} ms`}
                  bad={c.status !== 200}
                />
              ))}
            </Box>
          )}

          <LogTable
            title={`Server errors (${d.errors.length})`}
            empty="No server errors since the app started."
            rows={d.errors.map((e) => [time(e.at), e.where, e.message])}
            bad
          />
          <LogTable
            title={`Browser errors (${client.length})`}
            empty="No browser errors in this tab."
            rows={[...client]
              .reverse()
              .map((e) => [time(e.at), e.where, e.message])}
            bad
          />
          <LogTable
            title={`Outside API calls (${d.requests.length})`}
            empty="No outside calls yet. Update prices or open a chart."
            rows={d.requests.map((r) => [
              time(r.at),
              `${r.host}${r.path}`,
              `${r.status ?? "failed"} in ${r.ms} ms${r.error ? `: ${r.error}` : ""}`,
            ])}
          />
        </>
      )}
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-3">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <dl className="space-y-0.5 text-xs">{children}</dl>
    </section>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line pt-0.5 first:border-0">
      <dt className="truncate text-muted">{k}</dt>
      <dd className={`text-right font-mono ${bad ? "text-bad" : ""}`}>{v}</dd>
    </div>
  );
}

function LogTable({
  title,
  rows,
  empty,
  bad,
}: {
  title: string;
  rows: string[][];
  empty: string;
  bad?: boolean;
}) {
  return (
    <section className="panel p-3">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-line align-top first:border-0"
                >
                  <td className="py-1 pr-3 whitespace-nowrap text-muted">
                    {r[0]}
                  </td>
                  <td className="py-1 pr-3 font-mono break-all">{r[1]}</td>
                  <td
                    className={`py-1 break-words whitespace-pre-wrap ${bad ? "text-bad" : ""}`}
                  >
                    {r[2]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
