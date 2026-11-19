# Imbalance: handover

For the next Claude session. The user starts it with **"continue read the handover"**: read
this file, check `git status` and `git log --oneline -5`, say in 2 or 3 lines where things
stand, then carry on with the next milestone. The plan below is already approved.

## What it is

A local CS2 market scanner: free skin data and prices in, profitable trade-ups and
underpriced skins out, plus a tracker and "come back on" dates. It runs on the user's PC with
`npm start`. Friends clone the repo and add their own free keys through a popup. No
hosting, no accounts, everything in a local SQLite file.

| What                 | Where                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| Folder               | `E:\Github Repos\imbalance`, branch `main`                                          |
| Remote               | https://github.com/4bdulllahh/imbalance (not created yet)                           |
| Live site / download | none, friends `git clone`                                                           |
| CI                   | `.github/workflows/ci.yml`: lint, format, typecheck, tests, build on push to `main` |

## Starting a session

```
npm install
npm run check      # lint, format:check, typecheck, test, build
npm start          # build then run, fast pages (friends use this)
npm run dev        # http://localhost:3000 (bound to localhost only), live reload
```

## How the code is organised

| Folder / file                | What's in it                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/db.ts`              | `node:sqlite` connection, `MIGRATIONS` list, `PRAGMA user_version`, meta helpers                           |
| `src/lib/catalog.ts`         | ByMykel skins, collections, crates (zod) into `skins`, `skin_collections`, `rare_pool`                     |
| `src/lib/prices/skinport.ts` | Skinport items + sales history, snapshots every 6 h (weapon skins only)                                    |
| `src/lib/prices/csfloat.ts`  | CSFloat listings with floats, cached 10 min in `listings`                                                  |
| `src/lib/keys.ts`            | Key guide data (`KEY_DEFS`), read/write `.env.local`                                                       |
| `src/lib/queries.ts`         | Status, catalog search, skin detail with prices per wear                                                   |
| `src/lib/wear.ts`            | Wear tiers, `wearForFloat`, `marketHashName`, `toCents`                                                    |
| `src/lib/http.ts`            | `fetchJson` with timeout, zod check and plain-English errors                                               |
| `src/lib/same-origin.ts`     | Blocks POSTs from other websites                                                                           |
| `src/lib/currency.ts`        | Daily FX rates (open.er-api.com) cached in `meta`. `formatIn` lives in `format.ts`                         |
| `src/lib/fees.ts`            | Marketplaces and net-after-fee (Steam per-fee rounding, Skinport 8%, CSFloat 2%)                           |
| `src/lib/tradeup.ts`         | Pure maths: pool odds, normalized floats, wear, EV, ROI, odds to profit                                    |
| `src/lib/tradeup-data.ts`    | Loads input options, outcome pools, `sellPrice` (7/30/90-day median) and 30d volume                        |
| `src/lib/finder.ts`          | Target + filler mixes (1..N-1), listing quantity check, budget                                             |
| `src/lib/risk.ts`            | Risky = missing prices, or >25% of EV from skins sold under 3 times in 30 days                             |
| `src/lib/deals.ts`           | Items under their 30-day median that flip for profit, with trend signal                                    |
| `src/lib/trend.ts`           | `classifyTrend` (dip, rebounding, falling, rising), snapshot series and pruning                            |
| `src/lib/prices/steam.ts`    | Steam priceoverview per item on demand, cached 10 min as source `steam`                                    |
| `src/lib/special-float.ts`   | `floatFlags`: 0.00x, best of a wear, lowest/highest possible                                               |
| `src/lib/tracker.ts`         | Holdings (buy, sell, trade-up), settings (hold days, sell market), portfolio, backup/restore               |
| `src/lib/timeline.ts`        | `daysToSell`, `contractTimeline`, `nextSteps` (sell, hold, wait, come back on)                             |
| `src/lib/filters.ts`         | Plain-English search: filters schema, AI prompt, URL build and read back                                   |
| `src/lib/ai.ts`              | User-key AI: picks provider and model from the live model list, `SYSTEM_PROMPT`, `askAi`                   |
| `src/app/api/*`              | status, sync/*, skins, keys, listings, currency, tradeups, deals, steam-price, history, tracker, names, ai |
| `src/components/`            | Header, KeysModal, Money, Dashboard, Catalog, TradeUps, Deals, PriceHistory, Tracker, AskAi, FloatBadges   |
| `tools/screenshot.mjs`       | playwright-core + installed Edge screenshots, see Checking your work                                       |

Pages are client components that call the API routes. Logic stays in `src/lib/` with tests
next to it.

## Data and storage

- `data/imbalance.db` (gitignored). Schema v2 (v2 added `holdings`). New tables or columns: add an entry to
  `MIGRATIONS` in `src/lib/db.ts`, never edit an old one.
- Money is integer USD cents. Skinport `version` (Doppler phase) is part of price keys.
- `price_snapshots`: ~15k rows every 6 h, thinned on each snapshot to one a day after 7 days
  and one a week after 90 days.
- Tracker settings are JSON in `meta` key `settings`.
- Keys live in `.env.local` (then `.env`), read fresh on each call. `process.env` is ignored
  on purpose: Next copies `.env.local` into it and keeps deleted keys.

## Rules that must not break

- **Skinport rate limit** (about 8 requests per 5 min): every price sync goes through the
  5-minute cooldown, or the user's IP gets blocked.
- **POST routes check `isSameOrigin`.** Without it any website could overwrite keys.
- **GET routes that read the DB use the request or `await connection()`**, otherwise
  `cacheComponents` may prerender them at build time.
- **Don't call `Date.now()` during render** of a prerendered page: the build fails.
- **Souvenir skins can't go into trade-ups.** Covert trade-ups give an item from the
  collection's `rare_pool` (43 collections have one).

## Checking your work

`npm run check`, then `npm run dev` and screenshot with the installed Edge:

```
node tools/screenshot.mjs <outDir> tradeups --scan --click-first-row
node tools/screenshot.mjs <outDir> deals --scan --click=Chart --width=390
node tools/screenshot.mjs <outDir> tracker --light
```

Pass page names without a leading slash (Git Bash rewrites `/deals`). If the dev overlay
shows hydration errors after many edits, restart `npm run dev` before debugging: hot
reloads leave stale HTML.

POSTs from curl need `-H "Origin: http://localhost:3000"`.

## Milestones

| #   | Milestone                                                                      | Size | Status  |
| --- | ------------------------------------------------------------------------------ | ---- | ------- |
| M1  | Project setup                                                                  | S    | ✅ done |
| M2  | Local database with migrations                                                 | S    | ✅ done |
| M3  | Skin catalog (ByMykel) + catalog page with images                              | M    | ✅ done |
| M4  | Skinport prices, sales history, snapshots, rate-limit cooldown                 | M    | ✅ done |
| M5  | API keys popup + guide, `.env.local` saving, CSFloat listings                  | M    | ✅ done |
| M6  | Currency conversion (free FX rates, picker)                                    | S    | ✅ done |
| M7  | Trade-up maths engine (rules, odds, scaled float, wear, fees, EV, ROI)         | M    | ✅ done |
| M8  | Trade-up finder (cross-collection, fillers, float targets, tiers, owned skins) | M    | ✅ done |
| M9  | Trade-up dashboard                                                             | M    | ✅ done |
| M10 | Market imbalance scanner (below usual price, cross-market gaps)                | M    | ✅ done |
| M11 | Price charts, dip and rebound detection, snapshot pruning                      | M    | ✅ done |
| M12 | Special float flags                                                            | S    | ✅ done |
| M13 | Tracker and portfolio                                                          | M    | ✅ done |
| M14 | Timeline, cooldowns, "come back on", next steps                                | M    | ✅ done |
| M15 | AI advisor (Gemini / OpenRouter / Groq, user keys)                             | M    | ✅ done |
| M16 | Ask box: plain English to filters                                              | S    | ✅ done |
| M17 | Design pass: taste-skill, then impeccable                                      | M    | ✅ done |
| M18 | Ready for friends: full README, fresh-clone test                               | S    | ✅ done |
| M19 | Owner feedback pass: popups, filters, sorting, charts, limiter, dev tools      | L    | ✅ done |

## Current state

- **M19 (2026-11-19), owner feedback pass:**
  - Every side drawer is now a centered `Modal` (`src/components/ui.tsx`, native `<dialog>`).
    `ui.tsx` also has `SkinName` (rarity colour), `useSort` + `SortTh` (click a header to
    sort), `Field`, `Stat`, `numeric`.
  - Trade-ups: filter bar at the top (rarity dropdown, Normal/StatTrak, sell market, min and
    max spend in the shown currency). Columns: cost, expected back, profit, ROI, chance, no
    fee, after Steam, after Skinport, after CSFloat (2xl only), best, worst, days, risk. The
    popup copies the YouTube trade-up tools: stat tiles (with and without fees), outcome
    cards (green border = profit), input cards with Skinport links.
  - Finder tries three-skin mixes: the best 40 two-skin contracts get some slots moved to
    one of the 15 cheapest fillers. Budget and `accept` (hide risky) are checked before
    the limit, so risky mixes can't crowd out safe ones. Scans are cached in memory until
    prices, settings or holdings change (Covert: ~3.7 s first, ~0.1 s after).
  - Deals: same filter bar plus min price, sortable, Listed, After Steam/Skinport/CSFloat
    and ROI columns. Click any row for the chart.
  - Charts: CSFloat's public `/api/v1/history/<name>/graph` (no key, daily avg sale + count
    back to 2020) saved in `daily_history` (schema v3), refreshed every 12 h. Range buttons
    1M to All, sales bars underneath. `src/lib/recovery.ts` counts past drops as deep as
    today's (Skinport drop vs its 30-day median) and how many came back within 7/30/90
    days. Code-only counting, labelled as a rough hint when under 4 cases. Steam's listing
    page no longer embeds history without login, so Steam isn't used for charts.
  - Skins page: rarity, type, weapon, collection, min/max price, Has StatTrak, sort. The
    cheapest price is a range scan on the prices primary key, so the query stays ~0.2 s.
  - Settings page (`/settings`): API limits saved in meta `api_limits` (`src/lib/limiter.ts`
    has the zod schema and floors: Skinport 5 min, Steam 3 s). Every outside call goes
    through `fetchJson`, which waits its turn per host and logs host, path (never the
    query: keys), status and time. Optional auto update of prices while a tab is open
    (`Background.tsx`).
  - Dev tools page (`/debug`): versions, DB tables, keys set or not, limits, server errors
    (from `errorResponse`), browser errors (console.error and uncaught, captured by
    `Background.tsx`), outside API calls, health checks, and "Copy report for Claude".
  - Names show in rarity colour (knives and gloves gold) in trade-ups, deals, skins, tracker.
    Dropdowns use a themed chevron (`select.input` in `globals.css`).
  - Layout is `max-w-[88rem]` (was 6xl) so the trade-up table fits a 1366 px laptop.
    Lower-priority columns hide at md/lg/xl/2xl. Phones scroll the table sideways.
  - The "Slow filesystem detected" line in `npm run dev` comes from Turbopack's own
    benchmark of the E: drive and can't be turned off. `npm start` doesn't do it and serves
    pages much faster.

- **Last done:** all milestones M1 to M18. 86 tests pass. M16 finished: the Dashboard
  "Find" box sends plain English to the AI with `FILTERS_PROMPT`, `parseFilters` validates
  the JSON with zod, and the page opens with filters in the URL (`/tradeups?tier=...&max=20`).
  Trade-ups and Deals read them with `useSearchParams` inside `<Suspense>`. Amounts stay in the
  shown currency; the user clicks Scan, so exchange rates are loaded before converting.
- **After M18 (2026-11-17):**
  - A one-click `Start Imbalance.bat` was built, then removed at the owner's request: keep
    setup to `npm install` and `npm start`. Don't bring it back unless asked.
  - `npm start` is `next build && next start -H localhost`. A cached rebuild takes ~6 s,
    then pages answer in 5 to 20 ms (dev mode: 150 to 1500 ms per first visit on the E: drive).
  - The keys popup scrolled twice; `<dialog>` is now `overflow-hidden` and only the inner
    div scrolls. `color-scheme` plus a thin themed scrollbar in `globals.css`.
  - `npm audit` shows 16 high: all one `picomatch` ReDoS (<=4.0.7) in eslint and vitest
    deps only. No fixed version exists yet. Never run `npm audit fix --force` (it downgrades
    eslint-config-next and vitest). Recheck when picomatch 4.0.8+ ships.
  - Windows PowerShell blocks `npm.ps1` by default: README tells friends to use `npm.cmd`
    or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Next:** the owner continues tomorrow. Open items: test the AI (Find box, Ask AI) and
  CSFloat with real keys, then pick from `docs/roadmap.md`. taste-skill and impeccable were
  not installed, so M17 was done by hand; run them later if wanted.
- **Logo:** `src/app/icon.svg` (favicon) and `public/logo.svg` (header, README) are the same
  file. Edit both.
- **AI:** provider order Gemini, Groq, OpenRouter (first saved key wins). The model comes
  from the provider's live `/models` list via `pickModel` (cached a day), so renamed
  models don't break it. The AI gets only app-computed numbers and is told never to do maths.
- **Trade hold:** 7 days by default, a setting on the Tracker page. A trade-up output
  inherits the latest unlock of its inputs.
- **Open questions:** none.
- **Known issues:** AI calls untested with real keys. CSFloat response shape not checked
  against a real key. Key guide steps for CSFloat are from memory. Sell prices are
  Skinport-based even when "Sell on Steam" is picked. After many hot reloads the dev page
  can loop on full reloads: kill node, delete `.next`, restart (`npm start` is not affected).
- **Not pushed:** see `git log origin/main..main`.
