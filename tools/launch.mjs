// One-click start: installs, builds when the code changed, starts the server, opens the app in
// its own window, and stops the server when that window closes. Run by "Start Imbalance.bat".
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const say = (msg) => console.log(`  ${msg}`);
const fail = (msg) => {
  console.error(`\n  Problem: ${msg}\n`);
  process.exit(1);
};

const major = Number(process.versions.node.split(".")[0]);
if (major < 24)
  fail(
    `Imbalance needs Node.js 24 or newer, you have ${process.versions.node}. Get it from https://nodejs.org`,
  );

// npm through cmd on Windows: PowerShell may block npm.ps1, and .cmd files need a shell.
// Args are fixed strings from this file, never user input, so one shell string is safe.
const npm = (args) =>
  spawnSync(`npm ${args.join(" ")}`, { stdio: "inherit", shell: true })
    .status === 0;

/** Newest modification time of any file under these paths. */
function newest(paths) {
  let max = 0;
  const walk = (p) => {
    if (!existsSync(p)) return;
    const s = statSync(p);
    if (s.isDirectory()) for (const f of readdirSync(p)) walk(path.join(p, f));
    else max = Math.max(max, s.mtimeMs);
  };
  paths.forEach(walk);
  return max;
}

// 1. Packages: install when missing or when package-lock.json changed since the last install.
const installed = "node_modules/.package-lock.json";
if (
  !existsSync(installed) ||
  statSync("package-lock.json").mtimeMs > statSync(installed).mtimeMs
) {
  say("Installing packages (first time takes a minute or two)...");
  if (!npm(["install", "--no-audit", "--no-fund"]))
    fail("npm install failed. Check your internet connection and try again.");
}

// 2. Build: only when the code changed since the last build (e.g. after an update).
const stampFile = ".next/imbalance-build-stamp";
const stamp = String(
  newest(["src", "public", "package-lock.json", "next.config.ts"]),
);
const built =
  existsSync(stampFile) &&
  readFileSync(stampFile, "utf8") === stamp &&
  existsSync(".next/BUILD_ID");
if (!built) {
  say("Building the app (about a minute, only after updates)...");
  if (!npm(["run", "build"]))
    fail(
      "The build failed. Copy the messages above and send them to whoever shared Imbalance.",
    );
  writeFileSync(stampFile, stamp);
}

// 3. Port: reuse a running Imbalance, otherwise the first free port from 3000.
async function isImbalance(port) {
  try {
    const r = await fetch(`http://localhost:${port}/api/status`, {
      signal: AbortSignal.timeout(1500),
    });
    return r.ok && "skins" in (await r.json());
  } catch {
    return false;
  }
}
const isFree = (port) =>
  new Promise((resolve) => {
    const s = createServer().once("error", () => resolve(false));
    s.listen(port, "localhost", () => s.close(() => resolve(true)));
  });

let port = 3000;
let server = null;
if (await isImbalance(port)) {
  say("Imbalance is already running.");
} else {
  while (!(await isFree(port)))
    if (++port > 3020)
      fail("Ports 3000 to 3020 are all busy. Close some apps and try again.");
  say(`Starting on http://localhost:${port} ...`);
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "localhost",
      "-p",
      String(port),
    ],
    {
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  server.on("exit", (code) => {
    if (code)
      fail("The server stopped unexpectedly. Try again, or restart your PC.");
  });
  const until = Date.now() + 60_000;
  while (!(await isImbalance(port))) {
    if (Date.now() > until) fail("The server didn't start within a minute.");
    await new Promise((r) => setTimeout(r, 500));
  }
}
const url = `http://localhost:${port}`;

// 4. Window: Edge or Chrome in app mode with its own profile, so we know when it closes.
const browsers = [
  `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter((b) => b && !b.startsWith("undefined") && existsSync(b));

const stop = () => {
  server?.kill();
  process.exit(0);
};
process.on("SIGINT", stop);

if (browsers[0]) {
  const profile = path.join(root, "data", "app-window");
  mkdirSync(profile, { recursive: true });
  say("Opening Imbalance. Close its window to stop it.");
  const win = spawn(
    browsers[0],
    [
      `--app=${url}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--window-size=1300,900",
    ],
    {
      stdio: "ignore",
    },
  );
  win.on("exit", () => {
    say("Window closed, stopping Imbalance. Bye!");
    stop();
  });
} else {
  // No Edge or Chrome found: open the default browser and run until this window closes.
  const opener =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
  spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
  say(
    `Opened ${url} in your browser. Close this window (or press Ctrl+C) to stop Imbalance.`,
  );
}
