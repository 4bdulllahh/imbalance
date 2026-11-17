<h1 align="center">Imbalance</h1>

<p align="center"><b>Find profitable CS2 trade-ups and underpriced skins, on your own PC.</b></p>

Imbalance pulls CS2 skin data and live prices from free APIs, works out which trade-up
contracts make money after marketplace fees, and spots skins selling below their usual
price. It tracks what you bought and sold and tells you when to come back for the next step.
Everything runs on your computer: no account, no server, and your API keys stay in a file
on your PC.

**Version:** 0.1.0 (early, work in progress) · **Works on:** Windows, macOS, Linux with Node 24

> Not financial advice. Skin prices move fast and trade-ups are gambles with odds. Only
> spend what you can afford to lose.

## Getting started

1. Install [Node.js 24](https://nodejs.org) and [Git](https://git-scm.com).
2. Get the code and start it:
   ```
   git clone https://github.com/4bdulllahh/imbalance.git
   cd imbalance
   npm install
   npm run dev
   ```
3. Open http://localhost:3000. A popup explains which free API keys to add and where to get them.
4. To update later: `git pull`, then `npm install`. Your data is kept.

## Privacy

Prices, skins and your tracker are saved in `data/imbalance.db` on your PC. API keys are saved
in `.env.local`. Neither is ever uploaded or committed to git. The app only talks to the price
and skin APIs (and your chosen AI provider, if you add a key).

## For developers

```
npm install
npm run dev
npm run check     # lint, format, typecheck, tests, build
```

Next.js 16, TypeScript, Tailwind 4, SQLite via `node:sqlite`. Logic lives in `src/lib/` with
tests next to it. See [handover.md](handover.md) for the full picture.

## License

[MIT](LICENSE) · Made by [Abdullah](https://abdullahexe.online)
