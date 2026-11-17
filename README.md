<p align="center"><img src="public/logo.svg" alt="Imbalance logo: a bullet balancing on a table edge" width="96" height="96"></p>

<h1 align="center">Imbalance</h1>

<p align="center"><b>Find profitable CS2 trade-ups and underpriced skins, on your own PC.</b></p>

Imbalance pulls CS2 skin data and live prices from free APIs, works out which trade-up
contracts make money after marketplace fees, and spots skins selling below their usual
price. It tracks what you bought and sold and tells you when to come back for the next step.
Everything runs on your computer: no account, no server, and your API keys stay in a file
on your PC.

**Version:** 0.1.0 · **Works on:** Windows, macOS, Linux with Node 24 · **Cost:** free, every API is free

> Not financial advice. Skin prices move fast and trade-ups are gambles with odds. Only
> spend what you can afford to lose.

## What it does

| Page          | What you get                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | Update skins and prices, your next steps ("sell this", "come back on Tue"), and an AI question box                                             |
| **Trade-ups** | Profitable contracts for any rarity, mixing collections and cheap filler skins. Exact float maths, fees, odds, days to finish, risk check      |
| **Deals**     | Skins listed below their 30-day price that sell often enough to flip, with dip and rebound signals, price charts and a Steam price check       |
| **Skins**     | Every skin with images, float ranges, prices per wear, charts and CSFloat listings with special-float badges (0.00x, best of a wear and so on) |
| **Tracker**   | Log buys, sales and trade-ups. See what it is all worth after fees, when each item can be traded again, and back it up                         |

Prices show in your currency (pick it in the header). Dark and light themes.

## Getting started

1. Install [Node.js 24](https://nodejs.org) and [Git](https://git-scm.com).
2. Get the code and start it:
   ```
   git clone https://github.com/4bdulllahh/imbalance.git
   cd imbalance
   npm install
   npm run dev
   ```
3. Open http://localhost:3000. A popup lists the optional API keys, what each one unlocks,
   and how to get them (with steps and a video search link). You can skip it: the app works
   with no keys at all.
4. On the Dashboard, click **Update skin list**, then **Update prices**. Both take a few
   seconds. Prices can be updated again every 5 minutes (Skinport's limit).
5. Open **Trade-ups**, pick a rarity and click **Scan**.

To update later: `git pull`, then `npm install`. Your tracker and saved prices are kept.

## API keys (all optional, all free)

| Key                  | Unlocks                                  |
| -------------------- | ---------------------------------------- |
| `CSFLOAT_API_KEY`    | Live listings with exact floats          |
| `GEMINI_API_KEY`     | AI advisor (Google Gemini)               |
| `GROQ_API_KEY`       | AI advisor (Groq), if you have no Gemini |
| `OPENROUTER_API_KEY` | AI advisor (free OpenRouter models)      |

Add them with the **API keys** button. They are saved to `.env.local`, which git ignores.
The AI only comments on numbers Imbalance worked out. It never does the maths.

## Good to know

- **"Hide risky contracts" is on by default.** Contracts whose value comes mostly from
  skins that hardly ever sell look great on paper and lose money in real life.
- **Charts fill up over time.** The app saves prices every 6 hours while you use it.
- **New items are trade locked for 7 days.** Change this on the Tracker page if it changes.

## Troubleshooting

| Problem                                            | Fix                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm install` fails, or `node:sqlite` is not found | Run `node -v`. You need version 24 or newer                               |
| Port 3000 is in use                                | Close the other app, or run `npx next dev -H localhost -p 3001`           |
| Page stuck on "Loading" or keeps reloading         | Stop the app (Ctrl+C), delete the `.next` folder, run `npm run dev` again |
| "Too many requests"                                | Skinport allows about 8 requests per 5 minutes. Wait and try again        |

## Privacy

Prices, skins and your tracker are saved in `data/imbalance.db` on your PC. API keys are saved
in `.env.local`. Neither is ever uploaded or committed to git. The app only talks to the price
and skin APIs, the exchange rate API, and your chosen AI provider if you add a key. Your
tracker is only sent to the AI when you ask it a question on the Dashboard.

## For developers

```
npm install
npm run dev
npm run check     # lint, format, typecheck, tests, build
```

Next.js 16, TypeScript, Tailwind 4, SQLite via `node:sqlite`. Logic lives in `src/lib/` with
tests next to it. See [handover.md](handover.md) for the full picture and
[docs/roadmap.md](docs/roadmap.md) for what is next.

## License

[MIT](LICENSE) · Made by [Abdullah](https://abdullahexe.online)
