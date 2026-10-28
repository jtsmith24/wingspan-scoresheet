import {
  expect,
  KEYS,
  noDialog,
  openApp,
  playQuickGame,
  readStorage,
  respond,
  Sheet,
  test,
} from "./helpers";
import type { Page } from "@playwright/test";

const history = (page: Page) =>
  readStorage(page, KEYS.history).then(h => h ?? []);

const drawer = (page: Page) => page.locator(".past-drawer");
const slips = (page: Page) => page.locator("button.past-slip");
const full = (page: Page) => page.locator(".past-slip-full");

/** Jordan 60, Sam 30, ended. */
async function endQuickGame(sheet: Sheet, a?: string, b?: string) {
  await playQuickGame(sheet, a, b);
  await sheet.endButton().click();
  await expect(sheet.lastGame()).toBeVisible();
}

async function openFirstSlip(sheet: Sheet, page: Page) {
  await sheet.pastButton().click();
  await slips(page).first().click();
}

test.describe("ending a game", () => {
  test("a full sheet ends in one tap: saved, cleared, same players and boxes", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await sheet.addPlayer().click();
    await playQuickGame(sheet);
    await sheet.fillEvery(2, 1);
    await sheet.endButton().click();
    await noDialog(page);
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Jordan won with 60");
    expect(await sheet.codes()).toEqual(["JOR", "SAM", ""]);
    await expect(sheet.cell(0, 0)).toHaveValue("");
    await expect(sheet.expansionsTab()).toContainText("Oceania");
    await expect(sheet.lastGame()).toHaveText("✓ Last game: Jordan won with 60 · Undo");
    await expect(sheet.pastButton()).toHaveText("Past games · 1");
    await expect(sheet.endButton()).toBeDisabled();
  });

  test("can't end a blank sheet, or one with only names", async ({ page }) => {
    const sheet = await openApp(page);
    await expect(sheet.endButton()).toBeDisabled();
    await sheet.setName(0, "Jordan");
    await expect(sheet.endButton()).toBeDisabled();
  });

  test("a part-filled sheet asks; Keep playing changes nothing", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.fillColumn(0, [10, 10, 10]);
    await sheet.endButton().click();
    await respond(page, "3 score boxes are empty. Save as unfinished?", "Keep playing");
    await expect(sheet.cell(0, 0)).toHaveValue("10");
    expect(await history(page)).toHaveLength(0);
    await sheet.endButton().click();
    await page.keyboard.press("Escape");
    await noDialog(page);
    await expect(sheet.cell(0, 0)).toHaveValue("10");
  });

  test("one box left says so, and Save unfinished keeps it with no winner", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.cell(5, 1).fill("");
    await sheet.endButton().click();
    await respond(page, "1 score box is empty. Save as unfinished?", "Save unfinished");
    const [saved] = await history(page);
    expect(saved.decision).toBe("unfinished");
    expect(saved.winners).toEqual([]);
    await expect(sheet.lastGame()).toContainText("Unfinished game");
    await sheet.pastButton().click();
    await expect(slips(page).first().locator(".leader")).toHaveCount(0);
  });

  test("an unsettled tie asks before ending", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.fillColumn(1, [10, 10, 10, 10, 10, 10]);
    await sheet.endButton().click();
    await respond(page, /The tie isn't settled/, "Keep playing");
    expect(await history(page)).toHaveLength(0);
    await page.locator(".tiebreak-row input").nth(0).fill("2");
    await page.locator(".tiebreak-row input").nth(1).fill("1");
    await sheet.endButton().click();
    await noDialog(page);
    expect((await history(page))[0].summary).toBe("Jordan won with 60");
  });

  test("blank columns are left out of the saved game", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.addPlayer().click();
    await endQuickGame(sheet);
    const [saved] = await history(page);
    expect(saved.players.map((p: { name: string }) => p.name)).toEqual(["Jordan", "Sam"]);
    await expect(sheet.players()).toHaveCount(4);
  });

  test("double-tapping End game stores one game", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.endButton().dblclick();
    expect(await history(page)).toHaveLength(1);
  });

  test("the newest game is listed first", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet, "Alex", "Blake");
    await endQuickGame(sheet, "Casey", "Drew");
    await sheet.pastButton().click();
    await expect(slips(page).first()).toContainText("CAS");
    await expect(slips(page).nth(1)).toContainText("ALE");
  });

  test("Flock keeps its six seats", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    for (let c = 0; c < 6; c++) await sheet.fillEvery(c, c + 1);
    await sheet.endButton().click();
    await expect(sheet.players()).toHaveCount(6);
    await expect(sheet.title()).toHaveText("Flock");
  });

  test("boxes on the fresh sheet change with no question", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.expansions(["Americas"]);
    await noDialog(page);
    await expect(sheet.expansionsTab()).toContainText("Americas");
    expect((await history(page))[0].config.americas).toBe(false);
  });
});

test.describe("Undo and the last-game note", () => {
  test("Undo puts the sheet back exactly, and takes the game out of Past games", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await sheet.addPlayer().click();
    await playQuickGame(sheet, "Jordan Smith", "Sam");
    const forest = (await sheet.rowLabels()).indexOf("forest");
    await sheet.cell(forest, 0).fill("2");
    await sheet.endButton().click();
    await sheet.undo().click();
    expect(await sheet.codes()).toEqual(["JS", "SAM", ""]);
    await expect(sheet.cell(0, 0)).toHaveValue("10");
    await expect(sheet.cell(forest, 0)).toHaveValue("2");
    await expect(sheet.cell(forest, 1)).toHaveValue("");
    await expect(sheet.lastGame()).toHaveCount(0);
    await expect(sheet.pastButton()).toHaveCount(0);
    expect(await history(page)).toHaveLength(0);
  });

  test("the note goes once the new sheet is used", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.cell(0, 0).fill("4");
    await expect(sheet.lastGame()).toHaveCount(0);
    await sheet.cell(0, 0).fill("");
    await expect(sheet.lastGame()).toHaveCount(0);
    expect(await history(page)).toHaveLength(1);
  });

  test("renaming someone on the new sheet counts as using it", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.setName(1, "Alex");
    await expect(sheet.lastGame()).toHaveCount(0);
  });

  test("Undo only takes back its own game", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet, "Alex", "Blake");
    await sheet.cell(0, 0).fill("1");
    await sheet.cell(0, 0).fill("");
    await endQuickGame(sheet, "Casey", "Drew");
    await sheet.undo().click();
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].players[0].name).toBe("Alex");
  });

  test("the result in the note opens that game in Past games", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.lastGame().getByRole("button", { name: "Jordan won with 60" }).click();
    await expect(full(page)).toBeVisible();
    await expect(full(page).locator(".sheet-result")).toHaveText("Jordan won with 60");
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toHaveCount(0);
  });

  test("once the game is deleted from Past games, the note goes", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await page.locator(".past-actions").getByRole("button", { name: "Delete" }).click();
    await respond(page, "Delete this game from Past games?", "Delete");
    await page.keyboard.press("Escape");
    await expect(sheet.lastGame()).toHaveCount(0);
  });

  test("Undo in one tab shows in the other", async ({ page, context }) => {
    const a = await openApp(page);
    const other = await context.newPage();
    await other.goto("/");
    const b = new Sheet(other);
    await endQuickGame(a);
    await expect(b.lastGame()).toBeVisible();
    await b.undo().click();
    await expect(a.cell(0, 0)).toHaveValue("10");
    await expect(a.lastGame()).toHaveCount(0);
    await expect(a.pastButton()).toHaveCount(0);
  });
});

test.describe("Clear names", () => {
  test("only on a sheet with names and no scores", async ({ page }) => {
    const sheet = await openApp(page);
    await expect(sheet.clearNames()).toHaveCount(0);
    await endQuickGame(sheet);
    await sheet.clearNames().click();
    expect(await sheet.codes()).toEqual(["", ""]);
    await expect(sheet.clearNames()).toHaveCount(0);
    await sheet.setName(0, "Alex");
    await sheet.cell(0, 0).fill("3");
    await expect(sheet.clearNames()).toHaveCount(0);
  });

  test("a cleared name gets a fresh code when it's typed again", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet, "Jordan", "Jo");
    await sheet.clearNames().click();
    await sheet.setName(0, "Jody");
    expect(await sheet.codes()).toEqual(["JOD", ""]);
  });
});

test.describe("Past games", () => {
  test("opens, folds by tapping the sheet, and closes every way", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.pastButton().click();
    await expect(drawer(page)).toBeVisible();
    await expect(slips(page)).toHaveCount(1);
    await expect(slips(page).locator(".past-chevron")).toHaveText("▾");
    await slips(page).click();
    await expect(full(page)).toBeVisible();
    await expect(full(page).locator(".past-chevron")).toHaveText("▴");
    await expect(full(page).locator(".past-sheet")).toContainText("Total");
    await full(page).locator(".past-sheet td").first().click();
    await expect(full(page)).toHaveCount(0);
    await expect(slips(page)).toBeFocused();
    await slips(page).click();
    await full(page).locator(".past-slip-toggle").click();
    await expect(full(page)).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(drawer(page)).toHaveCount(0);
    await expect(sheet.pastButton()).toBeFocused();
    await sheet.pastButton().click();
    await page.getByRole("button", { name: "Close ✕" }).click();
    await expect(drawer(page)).toHaveCount(0);
    // A tap beside the drawer closes it, where there's room beside it (on
    // narrow phones it covers the screen and Close is the way out).
    await sheet.pastButton().click();
    const box = await drawer(page).boundingBox();
    if (box && box.x > 20) {
      await page.mouse.click(5, 5);
      await expect(drawer(page)).toHaveCount(0);
    }
  });

  test("the page behind doesn't scroll while it's open", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.pastButton().click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("Tab stays inside the drawer", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.pastButton().click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest(".past-drawer"))).toBe(true);
    }
  });

  test("tapping a code on the full sheet shows the full name", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet, "Jordan Smith", "Sam");
    await openFirstSlip(sheet, page);
    const peek = page.locator(".name-peek").first();
    await expect(peek).toHaveText("JS");
    await peek.click();
    await expect(peek).toHaveText("Jordan Smith");
    await expect(full(page)).toBeVisible();
    await peek.click();
    await expect(peek).toHaveText("JS");
  });

  test("Delete asks; Cancel keeps it; Escape there doesn't close the drawer", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    const del = page.locator(".past-actions").getByRole("button", { name: "Delete" });
    await del.click();
    await expect(page.locator("dialog[open] .app-dialog-cancel")).toBeFocused();
    await page.keyboard.press("Escape");
    await noDialog(page);
    await expect(drawer(page)).toBeVisible();
    await del.click();
    await respond(page, "Delete this game from Past games?", "Cancel");
    expect(await history(page)).toHaveLength(1);
  });

  test("deleting the last game leaves a blank drawer, then no button", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await page.locator(".past-actions").getByRole("button", { name: "Delete" }).click();
    await respond(page, "Delete this game from Past games?", "Delete");
    await expect(slips(page)).toHaveCount(0);
    await expect(drawer(page)).toHaveText(/^\s*Past games\s*Close ✕\s*$/);
    await page.keyboard.press("Escape");
    await expect(sheet.pastButton()).toHaveCount(0);
  });

  test("Play again: same box and players, fresh scores", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await endQuickGame(sheet);
    await sheet.clearNames().click();
    await sheet.expansions([]);
    await openFirstSlip(sheet, page);
    await page.getByRole("button", { name: "Play again with these players" }).click();
    await noDialog(page);
    await expect(drawer(page)).toHaveCount(0);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await expect(sheet.expansionsTab()).toContainText("Oceania");
    await expect(sheet.cell(0, 0)).toHaveValue("");
  });

  test("Play again over scores on the sheet saves them first, after asking", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await playQuickGame(sheet, "Alex", "Blake");
    await sheet.cell(0, 0).fill(""); // part-filled is fine to keep
    const again = async () => {
      await sheet.pastButton().click();
      await slips(page).last().click();
      await page.getByRole("button", { name: "Play again with these players" }).click();
    };
    await again();
    await respond(page, "Play again? The game on the sheet will be saved to Past games first.", "Cancel");
    await expect(drawer(page)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await sheet.codes()).toEqual(["ALE", "BLA"]);
    await again();
    await respond(page, /Play again\?/, "Save it and play again");
    const saved = await history(page);
    expect(saved).toHaveLength(2);
    expect(saved[0].decision).toBe("unfinished");
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("an unnamed player plays again as a blank seat", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.fillEvery(0, 3);
    await sheet.fillEvery(1, 1);
    await sheet.endButton().click();
    await sheet.clearNames().click();
    await openFirstSlip(sheet, page);
    await page.getByRole("button", { name: "Play again with these players" }).click();
    expect(await sheet.codes()).toEqual(["JOR", ""]);
  });

  test("a tie settled on food shows how on the slip and the full sheet", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 2);
    const food = page.locator(".tiebreak-row input");
    await food.nth(0).fill("4");
    await food.nth(1).fill("1");
    await sheet.endButton().click();
    await sheet.pastButton().click();
    await expect(slips(page)).toContainText("won on unused food 4 to 1");
    await slips(page).click();
    await expect(page.locator(".past-sheet .tiebreak-row")).toContainText("4");
  });
});

test.describe("editing a past game", () => {
  const edit = (page: Page) => page.locator(".past-actions").getByRole("button", { name: "Edit" });
  const pastCell = (page: Page, row: number, col: number) => page.locator(`#past-cell-${row}-${col}`);
  const saveChanges = (page: Page) => page.getByRole("button", { name: "Save changes" });

  test("fix a score: the same game, same date, new result; the sheet is untouched", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await sheet.cell(0, 0).fill("7");
    const [before] = await history(page);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await expect(pastCell(page, 0, 1)).toHaveValue("5");
    await pastCell(page, 0, 1).fill("50");
    await expect(full(page).locator(".sheet-result")).toHaveText("Sam won with 75");
    await saveChanges(page).click();
    await expect(full(page).locator(".past-sheet")).toBeVisible();
    await expect(full(page).locator(".sheet-result")).toHaveText("Sam won with 75");
    const after = await history(page);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(after[0].finishedAt).toBe(before.finishedAt);
    await page.keyboard.press("Escape");
    await expect(sheet.cell(0, 0)).toHaveValue("7");
  });

  test("Cancel and Escape drop the changes; a second Escape closes", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await pastCell(page, 0, 0).fill("99");
    await full(page).getByRole("button", { name: "Cancel" }).click();
    await expect(full(page).locator(".sheet-result")).toHaveText("Jordan won with 60");
    await edit(page).click();
    await expect(pastCell(page, 0, 0)).toHaveValue("10");
    await pastCell(page, 0, 0).fill("99");
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeVisible();
    await expect(pastCell(page, 0, 0)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toHaveCount(0);
    expect((await history(page))[0].summary).toBe("Jordan won with 60");
  });

  test("tapping inside the sheet being edited doesn't fold it", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await full(page).locator(".row-label").first().click();
    await expect(pastCell(page, 0, 0)).toBeVisible();
  });

  test("the keyboard moves between the past game's boxes, not the sheet's", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await pastCell(page, 0, 0).click();
    await page.keyboard.press("Enter");
    await expect(pastCell(page, 1, 0)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(pastCell(page, 1, 1)).toBeFocused();
  });

  test("Oceania nectar is re-worked out from what was spent", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await playQuickGame(sheet);
    await sheet.fillEvery(0, 10);
    await sheet.fillEvery(1, 5);
    const forest = (await sheet.rowLabels()).indexOf("forest");
    await sheet.cell(forest, 0).fill("1");
    await sheet.endButton().click();
    expect((await history(page))[0].players[0].breakdown.nectar).toBe(5);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await expect(pastCell(page, forest, 0)).toHaveValue("1");
    await pastCell(page, forest, 1).fill("3");
    await saveChanges(page).click();
    const [saved] = await history(page);
    expect(saved.players[0].breakdown.nectar).toBe(2);
    expect(saved.players[1].breakdown.nectar).toBe(5);
  });

  test("renaming a player shows on the slip", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await page.locator("#past-name-0").click();
    await page.locator("#past-name-0").fill("Morgan");
    await page.locator("#past-name-0").press("Enter");
    await saveChanges(page).click();
    await expect(full(page).locator(".sheet-result")).toHaveText("Morgan won with 60");
    await full(page).locator(".past-slip-toggle").click();
    await expect(slips(page)).toContainText("MOR");
  });

  test("finishing an unfinished game gives it a winner", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.cell(5, 1).fill("");
    await sheet.endButton().click();
    await respond(page, /Save as unfinished/, "Save unfinished");
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await pastCell(page, 5, 1).fill("5");
    await saveChanges(page).click();
    const [saved] = await history(page);
    expect(saved.decision).toBe("points");
    expect(saved.summary).toBe("Jordan won with 60");
  });

  test("can't save a game with every score cleared", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.cell(0, 0).fill("5");
    await sheet.endButton().click();
    await respond(page, /Save as unfinished/, "Save unfinished");
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await pastCell(page, 0, 0).fill("");
    await expect(saveChanges(page)).toBeDisabled();
  });

  test("Undo after an edit takes the edited game out", async ({ page }) => {
    const sheet = await openApp(page);
    await endQuickGame(sheet);
    await openFirstSlip(sheet, page);
    await edit(page).click();
    await pastCell(page, 0, 1).fill("50");
    await saveChanges(page).click();
    await page.keyboard.press("Escape");
    await sheet.undo().click();
    expect(await history(page)).toHaveLength(0);
    await expect(sheet.cell(0, 1)).toHaveValue("5");
  });
});
