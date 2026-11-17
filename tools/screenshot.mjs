// Screenshots pages of the running app with the installed Edge.
// Usage: node tools/screenshot.mjs <outDir> [page, e.g. tradeups] [--scan] [--click-first-row] [--width=390]
import { chromium } from "playwright-core";

const [outDir, rawPath = "", ...flags] = process.argv.slice(2);
const path = `/${rawPath.replace(/^\/+/, "")}`; // pass "tradeups": Git Bash mangles "/tradeups"
const width = Number(
  flags.find((f) => f.startsWith("--width="))?.split("=")[1] ?? 1280,
);
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.addInitScript(() =>
  localStorage.setItem("imbalance-keys-dismissed", "1"),
);
await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
if (flags.includes("--scan")) {
  await page.getByRole("button", { name: /^(Scan|Find deals)$/ }).click();
  await page.waitForSelector("table tbody tr", { timeout: 60_000 });
}
if (flags.includes("--click-first-row")) {
  await page.locator("table tbody tr").first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(1500);
}
const name = `${outDir}/shot-${path.replace(/\W+/g, "") || "home"}-${width}${flags.includes("--click-first-row") ? "-detail" : ""}.png`;
await page.screenshot({ path: name });
console.log(name);
await browser.close();
