import { expect, KEYS, noDialog, openApp, playQuickGame, readStorage, respond, Sheet, test } from "./helpers";
import type { Page } from "@playwright/test";

const history = (page: Page) => readStorage(page, KEYS.history).then(h => h ?? []);

async function saveQuickGame(sheet: Sheet) {
  await playQuickGame(sheet);
  await sheet.saveButton().click();
  await expect(sheet.saveButton()).toHaveText("Saved");
}

const box = (sheet: Sheet, name: string) =>
  sheet.checklist().locator(".mix-option", { hasText: name }).locator("input");

async function tick(sheet: Sheet, name: string) {
  if (!(await sheet.checklist().isVisible())) await sheet.expansionsTab().locator("button").click();
  await box(sheet, name).click();
}

const done = (sheet: Sheet) => sheet.checklist().getByRole("button", { name: "Done" }).click();

test.describe("edits after saving", () => {
  test("New game: Toss changes keeps the saved game as it was", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.cell(0, 1).fill("50");
    await sheet.newGameButton().click();
    await respond(page, "This game has changes that aren't saved. Keep them?", "Toss changes");
    await respond(page, "Who's playing next?", "New players");
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Jordan won with 60");
    await expect(sheet.saveButton()).toHaveText("Save");
  });

  test("New game: Update writes the changes into the same saved game", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.cell(0, 1).fill("50");
    await sheet.newGameButton().click();
    await respond(page, /has changes that aren't saved/, "Update");
    await respond(page, "Who's playing next?", "Same players");
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Sam won with 75");
  });

  test("Play again over an edited saved game asks about the changes", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.setName(0, "Jo");
    await sheet.pastButton().click();
    await page.locator("button.past-slip").click();
    await page.getByRole("button", { name: "Play again with these players" }).click();
    await respond(page, "Play again? The game on the sheet has changes that aren't saved. Keep them?", "Update");
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].players[0].name).toBe("Jo");
  });

  test("a game saved part-way, finished later, updates with a winner", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.fillColumn(0, [10, 10, 10]);
    await sheet.saveButton().click();
    expect((await history(page))[0].decision).toBe("unfinished");
    await sheet.fillColumn(0, [10, 10, 10, 10, 10, 10]);
    await sheet.fillColumn(1, [5, 5, 5, 5, 5, 5]);
    await expect(sheet.saveButton()).toHaveText("Update");
    await sheet.saveButton().click();
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Jordan won with 60");
  });

  test("still Saved after a reload, and the box question still comes", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await page.reload();
    await expect(sheet.saveButton()).toHaveText("Saved");
    await expect(page.locator(".sheet-actions .ink-button-primary")).toHaveText("New game");
    await tick(sheet, "Oceania");
    await respond(page, /This game is saved/, "Cancel");
  });
});

test.describe("boxes on a saved game", () => {
  test("a typo fix first doesn't skip the question; the fix is kept with the old boxes", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.cell(0, 1).fill("50");
    await tick(sheet, "Oceania");
    await respond(page, "This game is saved. Start a new game with Oceania, or change this one?", "New game");
    await respond(page, "This game has changes that aren't saved. Keep them?", "Update");
    await respond(page, "Who's playing next?", "Same players");
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].summary).toBe("Sam won with 75");
    expect(saved[0].config.oceania).toBe(false);
    await expect(sheet.expansionsTab()).toContainText("Oceania");
    await expect(sheet.cell(0, 1)).toHaveValue("");
  });

  test("Cancel on Who's playing changes nothing", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await tick(sheet, "Oceania");
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "Cancel");
    await expect(box(sheet, "Oceania")).not.toBeChecked();
    await done(sheet);
    await expect(sheet.cell(0, 0)).toHaveValue("10");
    await expect(sheet.saveButton()).toHaveText("Saved");
  });

  test("the new game saves as its own entry with its own boxes", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await tick(sheet, "Americas");
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "Same players");
    await done(sheet);
    await sheet.fillEvery(0, 3);
    await sheet.fillEvery(1, 1);
    await sheet.saveButton().click();
    const saved = await history(page);
    expect(saved).toHaveLength(2);
    expect(saved[0].config.americas).toBe(true);
    expect(saved[1].config.americas).toBe(false);
  });

  test("after Change this game: going back to the saved boxes asks nothing", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await tick(sheet, "European");
    await respond(page, /This game is saved/, "Change this game");
    await tick(sheet, "European");
    await noDialog(page);
    await done(sheet);
    await expect(sheet.baseTab()).toHaveClass(/is-on/);
    await expect(sheet.saveButton()).toHaveText("Update");
  });

  test("after Change this game + Update, the next change asks again", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await tick(sheet, "European");
    await respond(page, /This game is saved/, "Change this game");
    await done(sheet);
    await sheet.saveButton().click();
    expect((await history(page))[0].config.european).toBe(true);
    await tick(sheet, "Oceania");
    await respond(page, "This game is saved. Start a new game with European + Oceania, or change this one?", "Cancel");
  });

  test("switching Asia's mode on a saved game asks too", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"]);
    await saveQuickGame(sheet);
    await sheet.asiaMode("duet");
    await respond(page, /Start a new game with Asia · Duet, or change this one\?/, "Cancel");
    await expect(sheet.checklist().locator("select")).toHaveValue("standard");
    await sheet.asiaMode("duet");
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "Same players");
    await expect(sheet.title()).toHaveText("Duet");
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("a saved three-player game going to Duet still asks about the third column", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await playQuickGame(sheet);
    await sheet.setName(2, "Alex");
    await sheet.fillColumn(2, [1, 1, 1, 1, 1, 1]);
    await sheet.saveButton().click();
    await tick(sheet, "Asia");
    await respond(page, /This game is saved/, "Change this game");
    await sheet.asiaMode("duet");
    await respond(page, /up to 2 players/, "Cancel");
    await expect(sheet.players()).toHaveCount(3);
    await expect(sheet.checklist().locator("select")).toHaveValue("standard");
  });

  test("New game into Duet from three players keeps the first two", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"]);
    await sheet.addPlayer().click();
    await playQuickGame(sheet);
    await sheet.setName(2, "Alex");
    await sheet.fillColumn(2, [1, 1, 1, 1, 1, 1]);
    await sheet.saveButton().click();
    await sheet.asiaMode("duet");
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "Same players");
    await expect(sheet.players()).toHaveCount(2);
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("New game into Flock fills out six seats", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"]);
    await saveQuickGame(sheet);
    await sheet.asiaMode("flock");
    await respond(page, /This game is saved/, "New game");
    await respond(page, "New game. Who's playing?", "Same players");
    await expect(sheet.players()).toHaveCount(6);
    expect((await sheet.codes()).slice(0, 2)).toEqual(["JOR", "SAM"]);
  });

  test("once the saved game is deleted, boxes change without a question", async ({ page }) => {
    const sheet = await openApp(page);
    await saveQuickGame(sheet);
    await sheet.pastButton().click();
    await page.locator("button.past-slip").click();
    await page.locator(".past-actions").getByRole("button", { name: "Delete" }).click();
    await respond(page, "Delete this game from Past games?", "Delete");
    await page.keyboard.press("Escape");
    await tick(sheet, "Oceania");
    await noDialog(page);
    await done(sheet);
    await sheet.saveButton().click();
    const saved = await history(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].config.oceania).toBe(true);
  });

  test("an unsaved game changes boxes without a question", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await tick(sheet, "Oceania");
    await noDialog(page);
    await expect(box(sheet, "Oceania")).toBeChecked();
  });

  test("Play again from a saved game sets its boxes without a question", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["European"]);
    await saveQuickGame(sheet);
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "New players");
    await sheet.expansions([]);
    await playQuickGame(sheet, "Alex", "Blake");
    await sheet.saveButton().click();
    await sheet.pastButton().click();
    await page.locator("button.past-slip").last().click();
    await page.getByRole("button", { name: "Play again with these players" }).click();
    await noDialog(page);
    await expect(sheet.expansionsTab()).toContainText("European");
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });
});

test.describe("two tabs", () => {
  test("a game saved in one tab asks before boxes change in the other", async ({ page, context }) => {
    const a = await openApp(page);
    const other = await context.newPage();
    await other.goto("/");
    const b = new Sheet(other);
    await saveQuickGame(a);
    await expect(b.saveButton()).toHaveText("Saved");
    await tick(b, "Oceania");
    await respond(other, /This game is saved/, "Cancel");
  });
});
