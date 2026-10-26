import {
  expect,
  KEYS,
  noDialog,
  openApp,
  playQuickGame,
  readStorage,
  respond,
  test,
  type Sheet,
} from "./helpers";
import type { Page } from "@playwright/test";

const history = (page: Page) =>
  readStorage(page, KEYS.history).then(h => h ?? []);

const drawer = (page: Page) => page.locator(".past-drawer");
const slips = (page: Page) => page.locator("button.past-slip");

async function saveQuickGame(sheet: Sheet, a?: string, b?: string) {
  await playQuickGame(sheet, a, b);
  await sheet.saveButton().click();
  await expect(sheet.saveButton()).toHaveText("Saved");
}

test.describe("saving", () => {
  test("Save, then Saved, then Update after an edit", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await expect(sheet.saveButton()).toHaveText("Save game");
    await sheet.saveButton().click();
    await expect(sheet.saveButton()).toHaveText("Saved");
    await expect(sheet.saveButton()).toBeDisabled();
    await expect(sheet.pastButton()).toHaveText("Past games · 1");
    await sheet.cell(0, 1).fill("50");
    await expect(sheet.saveButton()).toHaveText("Update saved game");
    await sheet.saveButton().click();
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Sam won with 75");
  });

  test("a part-filled game saves as unfinished, with no winner", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.cell(0, 0).fill("40");
    await sheet.saveButton().click();
    const [saved] = await history(page);
    expect(saved.decision).toBe("unfinished");
    expect(saved.winners).toEqual([]);
    await sheet.pastButton().click();
    await expect(slips(page).first()).toContainText("JOR");
    await expect(slips(page).first().locator(".leader")).toHaveCount(0);
    await slips(page).first().click();
    await expect(page.locator(".past-slip-full .sheet-result")).toHaveText("Unfinished game");
  });

  test("names alone can't be saved", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await expect(sheet.saveButton()).toBeDisabled();
  });

  test("blank columns are left out of the saved game", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.addPlayer().click();
    await saveQuickGame(sheet);
    const [saved] = await history(page);
    expect(saved.players.map((p: { name: string }) => p.name)).toEqual(["Jordan", "Sam"]);
  });

  test("double-tapping Save stores one game", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.saveButton().dblclick();
    expect(await history(page)).toHaveLength(1);
  });

  test("the newest game is listed first", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet, "Alex", "Blake");
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await saveQuickGame(sheet, "Casey", "Drew");
    await sheet.pastButton().click();
    await expect(slips(page).first()).toContainText("CAS");
    await expect(slips(page).nth(1)).toContainText("ALE");
  });
});

test.describe("New game", () => {
  test("disabled on a blank sheet", async ({ page }) => {
    const sheet = await openApp(page);
    await expect(sheet.newGameButton()).toBeDisabled();
  });

  test("names only: one plain question, names cleared, box kept", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await sheet.addPlayer().click();
    await sheet.setName(0, "Jordan");
    await sheet.newGameButton().click();
    await respond(page, "Start a new game? The names will be cleared.", "Cancel");
    expect(await sheet.codes()).toEqual(["JOR", "", ""]);
    await sheet.newGameButton().click();
    await respond(page, "Start a new game? The names will be cleared.", "Start new game");
    expect(await sheet.codes()).toEqual(["", "", ""]);
    await expect(sheet.expansionsTab()).toContainText("Oceania");
    await expect(sheet.newGameButton()).toBeDisabled();
  });

  test("unsaved: Save it + Same players", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.newGameButton().click();
    const step = page.locator("dialog[open] .app-dialog-step");
    await expect(step).toHaveText(/1 of 2/i);
    await respond(page, "This game hasn't been saved. Keep it?", "Save it");
    // Nothing changes until the last answer.
    await expect(sheet.cell(0, 0)).toHaveValue("10");
    expect(await history(page)).toHaveLength(0);
    await expect(step).toHaveText(/2 of 2/i);
    await respond(page, "Who's playing next?", "Same players");
    expect(await history(page)).toHaveLength(1);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await expect(sheet.cell(0, 0)).toHaveValue("");
    await expect(sheet.saveButton()).toHaveText("Save game");
    await expect(sheet.saveButton()).toBeDisabled();
  });

  test("unsaved: Toss it + New players", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.newGameButton().click();
    await respond(page, /Keep it\?/, "Toss it");
    await respond(page, "Who's playing next?", "New players");
    expect(await history(page)).toHaveLength(0);
    expect(await sheet.codes()).toEqual(["", ""]);
    await expect(sheet.pastButton()).toHaveCount(0);
  });

  test("Cancel at either step leaves the game exactly as it was", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.newGameButton().click();
    await respond(page, /Keep it\?/, "Cancel");
    await sheet.newGameButton().click();
    await respond(page, /Keep it\?/, "Save it");
    await respond(page, "Who's playing next?", "Cancel");
    expect(await history(page)).toHaveLength(0);
    await expect(sheet.cell(0, 0)).toHaveValue("10");
    await expect(sheet.saveButton()).toHaveText("Save game");
  });

  test("Escape and a tap outside both cancel", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.newGameButton().click();
    await page.keyboard.press("Escape");
    await noDialog(page);
    await sheet.newGameButton().click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.mouse.click(5, 5);
    await noDialog(page);
    await expect(sheet.cell(0, 0)).toHaveValue("10");
  });

  test("already saved: only asks who's playing", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.newGameButton().click();
    await expect(page.locator("dialog[open] .app-dialog-step")).toHaveCount(0);
    await respond(page, "New game. Who's playing?", "Same players");
    expect(await history(page)).toHaveLength(1);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("edited after saving counts as unsaved again", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.cell(0, 0).fill("11");
    await sheet.newGameButton().click();
    await respond(page, /Keep it\?/, "Save it");
    await respond(page, "Who's playing next?", "Same players");
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].players[0].total).toBe(61);
  });

  test("Save it focuses the safe choice; Enter picks it", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.newGameButton().click();
    await expect(page.locator("dialog[open] .app-dialog-confirm")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog[open] .app-dialog-message")).toHaveText("Who's playing next?");
    await page.keyboard.press("Enter");
    await noDialog(page);
    expect(await history(page)).toHaveLength(1);
  });

  test("Duet keeps its two seats; Flock its six", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await sheet.setName(0, "Jordan");
    await sheet.newGameButton().click();
    await respond(page, /names will be cleared/, "Start new game");
    await expect(sheet.players()).toHaveCount(6);
    await expect(sheet.title()).toHaveText("Flock");
  });
});

test.describe("Past games", () => {
  test("opens, folds by tapping the sheet, and closes every way", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    await expect(drawer(page)).toBeVisible();
    await expect(page.locator(".past-head")).not.toContainText("←");
    await expect(slips(page)).toHaveCount(1);
    await expect(slips(page).locator(".past-chevron")).toHaveText("▾");
    await slips(page).click();
    const full = page.locator(".past-slip-full");
    await expect(full).toBeVisible();
    await expect(full.locator(".past-chevron")).toHaveText("▴");
    await expect(full.locator(".past-sheet")).toContainText("Total");
    await full.locator(".past-sheet td").first().click();
    await expect(full).toHaveCount(0);
    await expect(slips(page)).toBeFocused();
    await slips(page).click();
    await full.locator(".past-slip-toggle").click();
    await expect(full).toHaveCount(0);

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
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("Tab stays inside the drawer", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest(".past-drawer"))).toBe(true);
    }
  });

  test("tapping a code on the full sheet shows the full name", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet, "Jordan Smith", "Sam");
    await sheet.pastButton().click();
    await slips(page).click();
    const peek = page.locator(".name-peek").first();
    await expect(peek).toHaveText("JS");
    await peek.click();
    await expect(peek).toHaveText("Jordan Smith");
    await expect(page.locator(".past-slip-full")).toBeVisible();
    await peek.click();
    await expect(peek).toHaveText("JS");
  });

  test("Delete asks; Cancel keeps it; Escape there doesn't close the drawer", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    await slips(page).click();
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
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    await slips(page).click();
    await page.locator(".past-actions").getByRole("button", { name: "Delete" }).click();
    await respond(page, "Delete this game from Past games?", "Delete");
    await expect(slips(page)).toHaveCount(0);
    await expect(drawer(page)).toHaveText(/^\s*Past games\s*Close ✕\s*$/);
    // The game on the sheet was that one: it can be saved again.
    await page.keyboard.press("Escape");
    await expect(sheet.pastButton()).toHaveCount(0);
    await expect(sheet.saveButton()).toHaveText("Save game");
    await expect(sheet.saveButton()).toBeEnabled();
  });

  test("Play again: same box and players, fresh scores", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await saveQuickGame(sheet);
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await sheet.expansions([]);
    await sheet.pastButton().click();
    await slips(page).click();
    await page.getByRole("button", { name: "Play again with these players" }).click();
    await expect(drawer(page)).toHaveCount(0);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await expect(sheet.expansionsTab()).toContainText("Oceania");
    await expect(sheet.cell(0, 0)).toHaveValue("");
  });

  test("Play again over unsaved scores asks to keep them", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await playQuickGame(sheet, "Alex", "Blake");
    const again = async () => {
      await sheet.pastButton().click();
      await slips(page).last().click();
      await page.getByRole("button", { name: "Play again with these players" }).click();
    };
    await again();
    await respond(page, /Play again\? The game on the sheet hasn't been saved/, "Cancel");
    await expect(drawer(page)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await sheet.codes()).toEqual(["ALE", "BLA"]);
    await again();
    await respond(page, /Play again\?/, "Save it");
    expect(await history(page)).toHaveLength(2);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("an unnamed player plays again as a blank seat", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.fillEvery(0, 3);
    await sheet.fillEvery(1, 1);
    await sheet.saveButton().click();
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await sheet.pastButton().click();
    await slips(page).click();
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
    await sheet.saveButton().click();
    await sheet.pastButton().click();
    await expect(slips(page)).toContainText("won on unused food 4 to 1");
    await slips(page).click();
    await expect(page.locator(".past-sheet .tiebreak-row")).toContainText("4");
  });
});
