import { expect, KEYS, openApp, playQuickGame, readStorage, respond, test } from "./helpers";

test.describe("on a touch screen", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "phone", "touch only"));

  test("a whole game by tapping: names, scores, box, save, new game", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.name(0).tap();
    await page.keyboard.type("Jordan");
    await page.keyboard.press("Enter");
    await sheet.name(1).tap();
    await page.keyboard.type("Sam");
    await sheet.cell(0, 0).tap(); // tapping away finishes the name too
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await sheet.expansionsTab().locator("button").tap();
    await sheet.checklist().locator(".mix-option", { hasText: "Americas" }).locator("input").tap();
    await sheet.checklist().getByRole("button", { name: "Done" }).tap();
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < 7; r++) {
        await sheet.cell(r, c).tap();
        await page.keyboard.type(String(r + c + 1));
      }
    }
    await expect(sheet.result()).toHaveText("Sam won with 35");
    await sheet.saveButton().tap();
    await expect(sheet.saveButton()).toHaveText("Saved");
    await sheet.newGameButton().tap();
    await page.locator("dialog[open]").getByRole("button", { name: "Same players" }).tap();
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await sheet.pastButton().tap();
    await page.locator("button.past-slip").tap();
    await page.locator(".past-sheet td").first().tap();
    await expect(page.locator(".past-slip-full")).toHaveCount(0);
    await page.getByRole("button", { name: "Close ✕" }).tap();
    await expect(page.locator(".past-drawer")).toHaveCount(0);
  });

  test("the name box for the last player stays on screen", async ({ page }) => {
    const sheet = await openApp(page);
    for (let i = 0; i < 3; i++) await sheet.addPlayer().tap();
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 700 });
      await sheet.name(4).tap();
      await page.keyboard.type("Christopher Robin");
      const box = await sheet.name(4).boundingBox();
      expect(box!.x, `${width}px`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${width}px`).toBeLessThanOrEqual(width);
      await page.keyboard.press("Enter");
    }
  });
});

test.describe("trickier ties", () => {
  test("everyone on 0 is a tie, not a blank sheet", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.cell(0, 0).fill("0");
    await expect(sheet.result()).toHaveText("11 boxes left to fill");
    await sheet.fillEvery(0, 0);
    await sheet.fillEvery(1, 0);
    await expect(sheet.result()).toContainText("Jordan and Sam tied with 0");
    const food = page.locator(".tiebreak-row input");
    await food.nth(0).fill("1");
    await food.nth(1).fill("0");
    await expect(sheet.result()).toContainText("Jordan won with 0");
    await sheet.saveButton().click();
    const [saved] = await readStorage(page, KEYS.history);
    expect(saved.summary).toBe("Jordan won with 0");
  });

  test("a third player joining the tie gets an empty food box", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 2);
    await sheet.fillEvery(2, 1);
    const food = page.locator(".tiebreak-row input");
    await food.nth(0).fill("3");
    await food.nth(1).fill("1");
    await expect(food.nth(2)).toBeDisabled();
    await expect(food.nth(2)).toHaveValue("");
    await sheet.cell(0, 2).fill("7"); // 7 + five 1s = 12, level with the others
    await expect(food.nth(2)).toBeEnabled();
    await expect(food.nth(2)).toHaveValue("");
    await expect(sheet.result()).toContainText("tied with 12");
  });

  test("the keyboard skips food boxes for players not in the tie", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 1);
    await sheet.fillEvery(2, 2);
    const food = page.locator(".tiebreak-row input");
    await food.nth(0).click();
    await page.keyboard.press("ArrowRight");
    await expect(food.nth(2)).toBeFocused();
  });

  test("food typed in an old tie isn't saved for someone not tied now", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 2);
    await page.locator(".tiebreak-row input").nth(1).fill("5");
    await sheet.cell(0, 0).fill("9");
    await sheet.saveButton().click();
    const [saved] = await readStorage(page, KEYS.history);
    expect(saved.players.map((p: { unusedFood: number | null }) => p.unusedFood)).toEqual([null, null]);
    expect(saved.detail).toBeUndefined();
  });
});

test.describe("saved games, more", () => {
  test("renaming after saving needs an update, which keeps its place", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet, "Alex", "Blake");
    await sheet.saveButton().click();
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await playQuickGame(sheet);
    await sheet.saveButton().click();
    await sheet.setName(0, "Jordan Smith");
    await expect(sheet.saveButton()).toHaveText("Update");
    const before = await readStorage(page, KEYS.history);
    await sheet.saveButton().click();
    const after = await readStorage(page, KEYS.history);
    expect(after).toHaveLength(2);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].finishedAt).toBe(before[0].finishedAt);
    expect(after[0].players[0].name).toBe("Jordan Smith");
  });

  test("Play again from a Duet game sets up Duet", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.fillEvery(0, 1);
    await sheet.fillEvery(1, 2);
    await sheet.saveButton().click();
    await sheet.baseTab().locator("button").click();
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "New players");
    await expect(sheet.title()).not.toHaveText("Duet");
    await sheet.pastButton().click();
    await expect(page.locator("button.past-slip")).toContainText("Asia (Duet)");
    await page.locator("button.past-slip").click();
    await expect(page.locator(".past-sheet .sheet-title")).toHaveText("Duet");
    await page.getByRole("button", { name: "Play again with these players" }).click();
    await expect(sheet.title()).toHaveText("Duet");
    await expect(sheet.players()).toHaveCount(2);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("past games list many games and scrolls", async ({ page }) => {
    const sheet = await openApp(page);
    for (let g = 0; g < 8; g++) {
      await playQuickGame(sheet, `Player${g}`, "Sam");
      await sheet.saveButton().click();
      await sheet.newGameButton().click();
      await respond(page, "New game. Who's playing?", "New players");
    }
    await expect(sheet.pastButton()).toHaveText("Past games · 8");
    await sheet.pastButton().click();
    await expect(page.locator("button.past-slip")).toHaveCount(8);
    const last = page.locator("button.past-slip").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await last.click();
    await expect(page.locator(".past-slip-full")).toBeVisible();
  });
});
