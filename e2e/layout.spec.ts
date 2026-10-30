import type { Page } from "@playwright/test";
import { expect, openApp, playQuickGame, respond, test } from "./helpers";

const PHONE_WIDTHS = [320, 360, 390, 430];
const WIDE_WIDTHS = [768, 1280];

const pageOverflows = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const insideViewport = (page: Page, selector: string) =>
  page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth + 0.5;
  });

test.describe("fits the screen", () => {
  test.beforeEach(({}, info) => {
    // Phone widths need the phone's viewport handling; wide ones a desktop's.
    test.skip(info.project.name !== "phone" && info.project.name !== "desktop");
  });

  const widths = (project: string) => (project === "phone" ? PHONE_WIDTHS : WIDE_WIDTHS);

  test("five players: three-digit hummingbird scores fit beside the sign tab", async ({ page }, info) => {
    const sheet = await openApp(page);
    for (let i = 0; i < 3; i++) await sheet.addPlayer().click();
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    for (let c = 0; c < 5; c++) await sheet.cell(row, c).fill(c % 2 ? "100" : "-123");
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      const fits = await page.evaluate(
        r => [...document.querySelectorAll<HTMLInputElement>(`input[id^="cell-${r}-"]`)].map(i => i.scrollWidth <= i.clientWidth),
        row
      );
      expect(fits, `${width}px`).toEqual([true, true, true, true, true]);
    }
  });

  test("Past games keeps its width with a game open, and five players fit", async ({ page }, info) => {
    const sheet = await openApp(page);
    for (let i = 0; i < 3; i++) await sheet.addPlayer().click();
    await sheet.expansions(["Americas"]);
    const hummingbirds = (await sheet.rowLabels()).indexOf("hummingbirds");
    for (let c = 0; c < 5; c++) {
      await sheet.fillEvery(c, 100 + c);
      await sheet.cell(hummingbirds, c).fill(c % 2 ? "100" : "-123");
    }
    await sheet.endButton().click();
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      await sheet.pastButton().click();
      const drawer = page.locator(".past-drawer");
      const listWidth = (await drawer.boundingBox())!.width;
      await page.locator("button.past-slip").click();
      expect((await drawer.boundingBox())!.width, `${width}px`).toBe(listWidth);
      const tableFits = () =>
        drawer.locator("table").evaluate(t => t.getBoundingClientRect().width <= t.parentElement!.clientWidth + 0.5);
      // Like the main sheet, five players fit from 360px; narrower scrolls.
      if (width >= 360) expect(await tableFits(), `viewing at ${width}px`).toBe(true);
      await page.locator(".past-actions").getByRole("button", { name: "Edit" }).click();
      if (width >= 360) expect(await tableFits(), `editing at ${width}px`).toBe(true);
      // Three-digit hummingbird scores fit beside their sign tabs.
      if (width >= 360)
        expect(
          await drawer.locator('input[id^="past-cell-"]').evaluateAll(inputs => inputs.every(i => i.scrollWidth <= i.clientWidth)),
          `hummingbird digits at ${width}px`
        ).toBe(true);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
    }
  });

  test("five named players and every expansion: no sideways page scroll", async ({ page }, info) => {
    const sheet = await openApp(page);
    for (let i = 0; i < 3; i++) await sheet.addPlayer().click();
    for (const [i, n] of ["Jordan", "Samantha", "Alex", "Blake", "Casey"].entries())
      await sheet.setName(i, n);
    await sheet.expansions(["European", "Oceania", "Asia", "Americas"]);
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      expect(await pageOverflows(page), `${width}px`).toBe(false);
      const tabs = page.locator(".expansion-tabs");
      expect(
        await tabs.evaluate(t => t.scrollWidth <= t.clientWidth),
        `tabs fit at ${width}px`
      ).toBe(true);
    }
  });

  test("seven Flock players: the sheet scrolls in its card, not the page", async ({ page }, info) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await sheet.addPlayer().click();
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      expect(await pageOverflows(page), `${width}px`).toBe(false);
    }
  });

  test("the expansions checklist stays on screen", async ({ page }, info) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      expect(await insideViewport(page, ".mix-popover"), `${width}px`).toBe(true);
    }
  });

  test("dialogs fit, buttons side by side and thumb-sized", async ({ page }, info) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.cell(0, 0).fill("");
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      await sheet.endButton().click();
      const card = page.locator("dialog[open] .app-dialog-card");
      await expect(card).toBeVisible();
      const buttons = await page
        .locator("dialog[open] .app-dialog-actions button")
        .evaluateAll(bs => bs.map(b => b.getBoundingClientRect()).map(r => ({ top: Math.round(r.top), h: r.height })));
      expect(new Set(buttons.map(b => b.top)).size, `one row at ${width}px`).toBe(1);
      expect(Math.min(...buttons.map(b => b.h)), `44px at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(await insideViewport(page, "dialog[open] .app-dialog-card"), `${width}px`).toBe(true);
      await respond(page, /Save as unfinished\?/, "Cancel");
    }
  });

  test("Past games drawer and a wide saved sheet fit", async ({ page }, info) => {
    const sheet = await openApp(page);
    for (let i = 0; i < 3; i++) await sheet.addPlayer().click();
    for (let c = 0; c < 5; c++) await sheet.fillEvery(c, c + 1);
    await sheet.endButton().click();
    await sheet.pastButton().click();
    await page.locator("button.past-slip").click();
    for (const width of widths(info.project.name)) {
      await page.setViewportSize({ width, height: 800 });
      expect(await insideViewport(page, ".past-drawer"), `${width}px`).toBe(true);
      expect(await pageOverflows(page), `${width}px`).toBe(false);
    }
  });
});

test.describe("pointer and hover", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "needs a mouse"));

  /** Every enabled control on screen that should show the pointing hand. */
  const wrongCursors = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("button:not(:disabled), select, .mix-option")]
        .filter(el => el.getClientRects().length && getComputedStyle(el).cursor !== "pointer")
        .map(el => el.outerHTML.slice(0, 80))
    );

  test("everything clickable shows the pointing hand", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    expect(await wrongCursors(page)).toEqual([]); // Clear, + Player, tabs
    await sheet.expansions(["Asia"], { close: false });
    expect(await wrongCursors(page)).toEqual([]); // checklist, mode menu, Done
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await playQuickGame(sheet);
    await sheet.cell(0, 0).fill("");
    await sheet.endButton().click();
    expect(await wrongCursors(page)).toEqual([]); // a dialog
    await respond(page, /Save as unfinished/, "Save unfinished");
    expect(await wrongCursors(page)).toEqual([]); // Undo, the last game, Past games
    await sheet.pastButton().click();
    await page.locator("button.past-slip").click();
    expect(await wrongCursors(page)).toEqual([]); // the open slip
  });

  test("quiet links change on hover", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.endButton().click();
    const link = sheet.pastButton();
    const before = await link.evaluate(el => getComputedStyle(el).color);
    await link.hover();
    await expect.poll(() => link.evaluate(el => getComputedStyle(el).color)).not.toBe(before);
  });
});

test("link previews: title, description, Open Graph and a 1200x630 image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Wingspan Score Sheet");
  const meta = (attr: string, key: string) =>
    page.locator(`meta[${attr}="${key}"]`).getAttribute("content");
  expect(await meta("name", "description")).toContain("fan-made");
  expect(await meta("name", "description")).toContain("not affiliated with Stonemaier Games");
  expect(await meta("property", "og:title")).toBe("Wingspan Score Sheet");
  expect(await meta("property", "og:url")).toBe("https://wingspanscoresheet.vercel.app");
  expect(await meta("property", "og:type")).toBe("website");
  expect(await meta("name", "twitter:card")).toBe("summary_large_image");
  expect(await meta("property", "og:image:width")).toBe("1200");
  expect(await meta("property", "og:image:height")).toBe("630");
  expect(await meta("property", "og:image:alt")).toBeTruthy();
  // Both images point at the live site, and are served (here, by the local build).
  for (const url of [await meta("property", "og:image"), await meta("name", "twitter:image")]) {
    const image = new URL(url!);
    expect(image.origin).toBe("https://wingspanscoresheet.vercel.app");
    const response = await request.get(image.pathname + image.search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});
