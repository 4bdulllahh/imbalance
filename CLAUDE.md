# Imbalance: notes for Claude

A local CS2 market scanner. It pulls skin data and prices from free APIs, finds profitable
trade-up contracts (with exact float maths and marketplace fees) and underpriced skins,
tracks what the user bought and sold, and says when to come back for the next step. Free
personal tool for the owner and friends who clone the repo and run it with `npm start`.
Next.js + SQLite, nothing is hosted.

**Read [handover.md](handover.md) before changing anything.** It has the milestone plan and
where the work stopped. Also follow [AGENTS.md](AGENTS.md): this Next.js version differs
from training data, so read `node_modules/next/dist/docs/` before using a Next API.

## Project choices

| Choice    | This project                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------- |
| Stack     | Next.js 16 (App Router, `cacheComponents` on), TypeScript strict, Tailwind 4, zod, vitest           |
| Data      | SQLite through Node's built-in `node:sqlite`, file `data/imbalance.db` (gitignored)                 |
| API keys  | Users bring their own free keys, saved to `.env.local` by the setup popup (not encrypted, ok)       |
| Languages | English only                                                                                        |
| Themes    | Dark (default) + light, toggle in the header                                                        |
| Currency  | Prices stored in USD cents, shown in the user's chosen currency (M6)                                |
| Design    | Plain for now, taste-skill then impeccable in M17                                                   |
| Shipping  | Friends `git clone` and `git pull`. No releases, no hosting                                         |
| Version   | 0.1.0, stored in `package.json`                                                                     |
| Skills    | ponytail, i-have-adhd, ration, taste-skill, impeccable, mattpocock/skills, web-asset-generator, ECC |
| Repo      | https://github.com/4bdulllahh/imbalance (create before the first push)                              |

## Rules that are easy to break

- **Free APIs only.** Never add a paid service. Every key is optional: the app must still run
  with an empty `.env.local`.
- **Money is integer USD cents** everywhere in `src/lib/`. Convert API dollars with
  `toCents()`. Only the UI converts to another currency.
- **`src/lib/` never imports React or `next/*` UI code.** All maths and parsing live there,
  with tests next to them as `*.test.ts`.
- **Database changes need a new entry in `MIGRATIONS` (`src/lib/db.ts`).** Friends update with
  `git pull`, so their tracker data must survive.
- **Validate every API response with zod** before it touches the database.
- **Respect rate limits:** Skinport allows about 8 requests per 5 minutes. Syncs go through the
  cooldown in `src/lib/sync-state.ts`.
- **The AI never does maths.** Code computes floats, odds and EV. The AI only comments on
  them (M15).
- **Client components only import pure modules from `src/lib/`** (`format`, `fees`, `tradeup`,
  `risk`, `trend` types and labels). Anything that imports `db.ts` pulls `node:sqlite` into the
  browser bundle and the page fails with a Turbopack error.
- **`node:sqlite` binds JS numbers as REAL.** Integer maths in SQL (like `taken_at / day`)
  needs `CAST(... AS INTEGER)`.
- **Trade-up odds use the pool model,** not the per-collection split in the original brief.
  See `outcomeProbabilities` in `src/lib/tradeup.ts`.
- No em dashes, en dashes or the ellipsis character anywhere, including UI text.

## Everyday commands

```
npm install
npm start            # build (cached, ~6 s) then run: what friends use
npm run dev          # http://localhost:3000, live reload
npm run check        # lint, format check, typecheck, tests, build (what CI runs)
npm test
```
