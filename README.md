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

| Page          | What you get                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | Update skins and prices, your next steps ("sell this", "come back on Tue"), a plain-English search ("purple trade-ups under 20") and an AI question box |
| **Trade-ups** | Profitable contracts for any rarity, mixing collections and cheap filler skins. Exact float maths, fees, odds, days to finish, risk check               |
| **Deals**     | Skins listed below their 30-day price that sell often enough to flip, with dip and rebound signals, price charts and a Steam price check                |
| **Skins**     | Every skin with images, float ranges, prices per wear, charts and CSFloat listings with special-float badges (0.00x, best of a wear and so on)          |
| **Tracker**   | Log buys, sales and trade-ups. See what it is all worth after fees, when each item can be traded again, and back it up                                  |

Prices show in your currency (pick it in the header). Dark and light themes.

## How to run it (Windows, the easy way)

1. **Download:** on this GitHub page click the green **Code** button, then **Download ZIP**.
2. **Unzip:** right-click the ZIP, pick **Extract All**, and open the extracted folder.
3. **Start:** double-click **`Start Imbalance.bat`**.
   - If Windows says "Windows protected your PC", click **More info**, then **Run anyway**.
     It shows this for any downloaded script.
   - If you don't have Node.js, it offers to install it for you. Say yes, wait, then
     double-click `Start Imbalance.bat` again.
   - The first start installs and builds the app, which takes a few minutes. After that it
     opens in a couple of seconds.
4. Imbalance opens in its own window. **Close that window to stop it.** To use it again,
   double-click `Start Imbalance.bat` again.

**First time in the app:** a popup lists the optional API keys (you can close it and add them
later, see below). On the **Dashboard** click **Update skin list**, then **Update prices**. Then
open **Trade-ups**, pick a rarity and click **Scan**.

**Updating:** download the new ZIP and extract it, then copy two things from your old folder
into the new one: the `data` folder (your tracker and saved prices) and the `.env.local` file
(your keys). Start the new one with `Start Imbalance.bat`. It rebuilds once by itself.

### Other ways to run it

With Git (updates with one command, and works on macOS and Linux too). Needs
[Node.js 24 or newer](https://nodejs.org) and [Git](https://git-scm.com):

```
git clone https://github.com/4bdulllahh/imbalance.git
cd imbalance
node tools/launch.mjs
```

`node tools/launch.mjs` does the same as the `.bat`: installs, builds, starts and opens the app.
To update, run `git pull` in the folder, then start it again. Your data is kept.

For development with live reload, use `npm install` then `npm run dev` and open
http://localhost:3000. On Windows PowerShell, if `npm` says "running scripts is disabled on
this system", type `npm.cmd` instead of `npm` (for example `npm.cmd install`), or run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Setting up the API keys

**You don't need any keys to start.** Skin data (ByMykel CSGO-API), prices (Skinport) and
exchange rates are free and need no key. Keys only unlock extras, and all of them are free.

| Key                  | What it unlocks                    | Where to get it                                                  |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `CSFLOAT_API_KEY`    | Live listings with exact floats    | [csfloat.com/profile](https://csfloat.com/profile)               |
| `GEMINI_API_KEY`     | AI advisor and plain-English Find  | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY`       | AI advisor (if you have no Gemini) | [console.groq.com/keys](https://console.groq.com/keys)           |
| `OPENROUTER_API_KEY` | AI advisor (free models)           | [openrouter.ai/keys](https://openrouter.ai/keys)                 |

For the AI you need just one of Gemini, Groq or OpenRouter. Gemini is the easiest. If you
add more than one, Imbalance uses Gemini first, then Groq, then OpenRouter.

### CSFloat (exact floats)

1. Go to [csfloat.com](https://csfloat.com) and sign in with Steam.
2. Open your profile and pick the **Developers** tab.
3. Click **New Key**, give it any name, and copy the key.

Stuck? [Video guides on YouTube](https://www.youtube.com/results?search_query=how+to+get+csfloat+api+key)

### Google Gemini (AI, recommended)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a
   Google account.
2. Click **Create API key**.
3. Copy the key.

Stuck? [Video guides on YouTube](https://www.youtube.com/results?search_query=how+to+get+gemini+api+key+free+google+ai+studio)

### Groq (AI)

1. Go to [console.groq.com](https://console.groq.com) and sign in.
2. Open **API Keys** and click **Create API Key**.
3. Copy the key.

Stuck? [Video guides on YouTube](https://www.youtube.com/results?search_query=how+to+get+groq+api+key)

### OpenRouter (AI)

1. Go to [openrouter.ai](https://openrouter.ai) and sign in.
2. Open **Keys** and click **Create Key**.
3. Copy the key.

Stuck? [Video guides on YouTube](https://www.youtube.com/results?search_query=how+to+get+openrouter+api+key)

### Adding a key to Imbalance

**Easy way:** with the app running, click **API keys** in the top right, paste the key into
its box and click **Save**. It works straight away, no restart needed.

**By hand:** copy `.env.example` to a new file called `.env.local` in the `imbalance` folder
and put your keys after the `=` signs:

```
CSFLOAT_API_KEY=your-csfloat-key
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

Leave a line empty if you don't have that key. `.env.local` is ignored by git, so your keys
never get uploaded. Never paste your keys into an issue, a screenshot or a chat.

The AI only comments on numbers Imbalance worked out. It never does the maths.

## Good to know

- **"Hide risky contracts" is on by default.** Contracts whose value comes mostly from
  skins that hardly ever sell look great on paper and lose money in real life.
- **Charts fill up over time.** The app saves prices every 6 hours while you use it.
- **New items are trade locked for 7 days.** Change this on the Tracker page if it changes.

## Troubleshooting

| Problem                                            | Fix                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "running scripts is disabled on this system"       | Use `Start Imbalance.bat`, or type `npm.cmd` instead of `npm` in PowerShell                             |
| `npm install` fails, or `node:sqlite` is not found | Run `node -v`. You need version 24 or newer                                                             |
| Port 3000 is in use (with `npm run dev`)           | Close the other app, or run `npx next dev -H localhost -p 3001`. The `.bat` picks a free port by itself |
| Page stuck on "Loading" or keeps reloading         | Close the app, delete the `.next` folder, start it again                                                |
| "Too many requests"                                | Skinport allows about 8 requests per 5 minutes. Wait and try again                                      |

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
