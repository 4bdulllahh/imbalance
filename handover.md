# Imbalance: handover

For the next Claude session. The user starts it with **"continue read the handover"**: read
this file, check `git status` and `git log --oneline -5`, say in 2 or 3 lines where things
stand, then carry on with the next milestone. The plan below is already approved.

## What it is

A local CS2 market scanner: free skin data and prices in, profitable trade-ups and
underpriced skins out, plus a tracker and "come back on" dates. It runs on the user's PC with
`npm run dev`. Friends clone the repo and add their own free keys through a popup. No
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
npm run dev        # http://localhost:3000 (bound to localhost only)
```

## How the code is organised

| Folder / file                | What's in it                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/db.ts`              | `node:sqlite` connection, `MIGRATIONS` list, `PRAGMA user_version`, meta helpers               |
| `src/lib/catalog.ts`         | ByMykel skins, collections, crates (zod) into `skins`, `skin_collections`, `rare_pool`         |
| `src/lib/prices/skinport.ts` | Skinport items + sales history, snapshots every 6 h (weapon skins only)                        |
| `src/lib/prices/csfloat.ts`  | CSFloat listings with floats, cached 10 min in `listings`                                      |
| `src/lib/keys.ts`            | Key guide data (`KEY_DEFS`), read/write `.env.local`                                           |
| `src/lib/queries.ts`         | Status, catalog search, skin detail with prices per wear                                       |
| `src/lib/wear.ts`            | Wear tiers, `wearForFloat`, `marketHashName`, `toCents`                                        |
| `src/lib/http.ts`            | `fetchJson` with timeout, zod check and plain-English errors                                   |
| `src/lib/same-origin.ts`     | Blocks POSTs from other websites                                                               |
| `src/lib/currency.ts`        | Daily FX rates (open.er-api.com) cached in `meta`. `formatIn` lives in `format.ts`             |
| `src/lib/fees.ts`            | Marketplaces and net-after-fee (Steam per-fee rounding, Skinport 8%, CSFloat 2%)               |
| `src/lib/tradeup.ts`         | Pure maths: pool odds, normalized floats, wear, EV, ROI, odds to profit                        |
| `src/lib/tradeup-data.ts`    | Loads input options, outcome pools, `sellPrice` (7/30/90-day median) and 30d volume            |
| `src/lib/finder.ts`          | Target + filler mixes (1..N-1), listing quantity check, budget                                 |
| `src/lib/risk.ts`            | Risky = missing prices, or >25% of EV from skins sold under 3 times in 30 days                 |
| `src/lib/deals.ts`           | Items under their 30-day median that flip for profit, with trend signal                        |
| `src/lib/trend.ts`           | `classifyTrend` (dip, rebounding, falling, rising), snapshot series and pruning                |
| `src/lib/prices/steam.ts`    | Steam priceoverview per item on demand, cached 10 min as source `steam`                        |
| `src/app/api/*`              | status, sync/*, skins, keys, listings, currency, tradeups, deals, steam-price, history         |
| `src/components/`            | Header, KeysModal, Money (currency context), Dashboard, Catalog, TradeUps, Deals, PriceHistory |
| `tools/screenshot.mjs`       | playwright-core + installed Edge screenshots, see Checking your work                           |

Pages are client components that call the API routes. Logic stays in `src/lib/` with tests
next to it.

## Data and storage

- `data/imbalance.db` (gitignored). Schema v1. New tables or columns: add an entry to
  `MIGRATIONS` in `src/lib/db.ts`, never edit an old one.
- Money is integer USD cents. Skinport `version` (Doppler phase) is part of price keys.
- `price_snapshots`: ~15k rows every 6 h, thinned on each snapshot to one a day after 7 days
  and one a week after 90 days.
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
| M12 | Special float flags                                                            | S    | next    |
| M13 | Tracker and portfolio                                                          | M    |         |
| M14 | Timeline, cooldowns, "come back on", next steps                                | M    |         |
| M15 | AI advisor (Gemini / OpenRouter / Groq, user keys)                             | M    |         |
| M16 | Ask box: plain English to filters                                              | S    |         |
| M17 | Design pass: taste-skill, then impeccable                                      | M    |         |
| M18 | Ready for friends: full README, fresh-clone test                               | S    |         |

## Current state

- **Last done:** M6 to M11. 67 tests pass. Checked live: trade-up scans take 0.3 to 1 s per
  tier; safe contracts (risk filter on) show small real profits; no Covert contract passes
  the risk filter because knife wears rarely sell 3+ times a month on Skinport.
- **Next:** M12 special floats. Flag listings with very low floats (e.g. under 0.01, or
  the lowest possible for that skin) and very high ones (BS near 1.0) as premium in the
  CSFloat listings table and trade-up outputs. Needs a CSFloat key to see real listings.
- **For M13 (tracker):** feed owned items into the finder as `InputOption` with
  `owned: true` (cost = what they paid, or 0), so "use what I have" contracts appear.
- **For M14:** trade hold after buying is about 7 days. Keep it as a setting.
- **For M15:** check real Gemini model names in Google's docs before coding; the brief's
  names may be made up.
- **Open questions:** none.
- **Known issues:** CSFloat response shape not checked against a real key (docs site was
  down). The parser accepts both `[...]` and `{ data: [...] }`. Key guide steps for CSFloat
  are from memory. Sell prices are Skinport-based even when "Sell on Steam" is picked
  (Steam prices are per-item only, see the Deals page Steam check).
- **Not pushed:** see `git log origin/main..main`.
