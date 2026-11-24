/**
 * Read-only post-deploy smoke check for the live Wingspan Score Sheet site.
 * Opens the app at desktop and phone sizes, checks for HTTP and runtime errors,
 * and verifies the scorepad and setup menus render cleanly.
 */
import { chromium } from "@playwright/test";

const url = process.env.LIVE_URL || "https://wingspanscoresheet.vercel.app/";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: "phone", width: 360, height: 740, isMobile: true, hasTouch: true },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch (err) {
    if (process.env.CI) throw err;
    return await chromium.launch();
  }
}

const browser = await launchBrowser();

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    const page = await context.newPage();
    const errors = [];

    page.on("pageerror", err => errors.push(`pageerror: ${err.message}`));
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    if (!response || !response.ok()) {
      throw new Error(
        `[${vp.name}] Unexpected HTTP status: ${response ? response.status() : "no response"}`
      );
    }

    await page
      .getByRole("heading", { name: "WINGSPAN" })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .locator("#sum-table")
      .waitFor({ state: "visible", timeout: 10_000 });

    // Read-only UI check: open and dismiss the Expansions and Mode popovers.
    await page.getByRole("button", { name: /^Expansions/ }).click();
    await page
      .getByText("Which expansions are you playing?")
      .waitFor({ state: "visible", timeout: 5_000 });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^Mode:/ }).click();
    await page
      .getByText("Who are you playing?")
      .waitFor({ state: "visible", timeout: 5_000 });
    await page.keyboard.press("Escape");

    if (errors.length > 0) {
      throw new Error(`[${vp.name}] Runtime errors:\n${errors.join("\n")}`);
    }

    console.log(`[${vp.name}] OK (${url})`);
    await context.close();
  }
} finally {
  await browser.close();
}
