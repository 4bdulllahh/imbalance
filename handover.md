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

| Folder / file                | What's in it                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `src/lib/db.ts`              | `node:sqlite` connection, `MIGRATIONS` list, `PRAGMA user_version`, meta helpers       |
| `src/lib/catalog.ts`         | ByMykel skins, collections, crates (zod) into `skins`, `skin_collections`, `rare_pool` |
| `src/lib/prices/skinport.ts` | Skinport items + sales history, snapshots every 6 h (weapon skins only)                |
| `src/lib/prices/csfloat.ts`  | CSFloat listings with floats, cached 10 min in `listings`                              |
| `src/lib/keys.ts`            | Key guide data (`KEY_DEFS`), read/write `.env.local`                                   |
| `src/lib/queries.ts`         | Status, catalog search, skin detail with prices per wear                               |
| `src/lib/wear.ts`            | Wear tiers, `wearForFloat`, `marketHashName`, `toCents`                                |
| `src/lib/http.ts`            | `fetchJson` with timeout, zod check and plain-English errors                           |
| `src/lib/same-origin.ts`     | Blocks POSTs from other websites                                                       |
| `src/app/api/*`              | Route handlers: status, sync/catalog, sync/prices, skins, skins/[id], keys, listings   |
| `src/components/`            | Client UI: Header, KeysModal, Dashboard, Catalog                                       |

Pages are client components that call the API routes. Logic stays in `src/lib/` with tests
next to it.

## Data and storage

- `data/imbalance.db` (gitignored). Schema v1. New tables or columns: add an entry to
  `MIGRATIONS` in `src/lib/db.ts`, never edit an old one.
- Money is integer USD cents. Skinport `version` (Doppler phase) is part of price keys.
- `price_snapshots` grows ~15k rows every 6 h. Pruning is due in M11.
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

`npm run check`, then `npm run dev` and check the page in Edge. Headless screenshot:

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --window-size=1280,900 --virtual-time-budget=8000 --screenshot=<scratchpad>\shot.png http://localhost:3000/catalog
```

POSTs from curl need `-H "Origin: http://localhost:3000"`.

## Milestones

| #   | Milestone                                                                      | Size | Status  |
| --- | ------------------------------------------------------------------------------ | ---- | ------- |
| M1  | Project setup                                                                  | S    | ✅ done |
| M2  | Local database with migrations                                                 | S    | ✅ done |
| M3  | Skin catalog (ByMykel) + catalog page with images                              | M    | ✅ done |
| M4  | Skinport prices, sales history, snapshots, rate-limit cooldown                 | M    | ✅ done |
| M5  | API keys popup + guide, `.env.local` saving, CSFloat listings                  | M    | ✅ done |
| M6  | Currency conversion (free FX rates, picker)                                    | S    | next    |
| M7  | Trade-up maths engine (rules, odds, scaled float, wear, fees, EV, ROI)         | M    |         |
| M8  | Trade-up finder (cross-collection, fillers, float targets, tiers, owned skins) | M    |         |
| M9  | Trade-up dashboard                                                             | M    |         |
| M10 | Market imbalance scanner (below usual price, cross-market gaps)                | M    |         |
| M11 | Price charts, dip and rebound detection, snapshot pruning                      | M    |         |
| M12 | Special float flags                                                            | S    |         |
| M13 | Tracker and portfolio                                                          | M    |         |
| M14 | Timeline, cooldowns, "come back on", next steps                                | M    |         |
| M15 | AI advisor (Gemini / OpenRouter / Groq, user keys)                             | M    |         |
| M16 | Ask box: plain English to filters                                              | S    |         |
| M17 | Design pass: taste-skill, then impeccable                                      | M    |         |
| M18 | Ready for friends: full README, fresh-clone test                               | S    |         |

## Current state

- **Last done:** M1 to M5. 34 tests pass, build clean, checked live against Skinport
  (37,288 prices) and ByMykel (2,126 skins).
- **Next:** M6 currency. Rates from `https://open.er-api.com/v6/latest/USD` (free, no key,
  has AED and CAD; checked 2026-11-17). Store rates in `meta`, refresh daily, picker in the
  header, `formatMoney` takes the rate. Keep storage in USD cents.
- **Open questions:** none.
- **Known issues:** CSFloat response shape not checked against a real key (docs site was
  down). The parser accepts both `[...]` and `{ data: [...] }`. Test with a real key.
  Key guide steps for CSFloat are from memory.
- **Not pushed:** everything. GitHub repo `imbalance` must be created first.
