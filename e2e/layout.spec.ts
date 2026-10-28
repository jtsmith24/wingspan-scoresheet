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
