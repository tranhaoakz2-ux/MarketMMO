import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000";
const outPath = process.argv[3] || "screenshot.png";
const width = Number(process.argv[4] || 1280);
const height = Number(process.argv[5] || 900);
const fullPage = process.argv[6] !== "false";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.error("[pageerror]", err.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Scroll through the page so scroll-triggered reveal animations fire
// before the full-page screenshot is captured.
const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < scrollHeight; y += 400) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(120);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

await page.screenshot({ path: outPath, fullPage });
await browser.close();
console.log("saved", outPath);
