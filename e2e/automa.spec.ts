import {
  expect,
  KEYS,
  noDialog,
  openApp,
  readStorage,
  respond,
  Sheet,
  test,
} from "./helpers";
import type { Page } from "@playwright/test";

const history = (page: Page) =>
  readStorage(page, KEYS.history).then(h => h ?? []);
const full = (page: Page) => page.locator(".past-slip-full");

/** Jordan's base-game column: 76 in all. */
async function fillJordan(sheet: Sheet) {
  await sheet.setName(0, "Jordan");
  await sheet.fillColumn(0, [38, 7, 12, 9, 4, 6]);
}

/** The Automa's boxes: 5 face-down birds, 21 face-up, 14 goals, 11 eggs. */
async function fillAutoma(sheet: Sheet, faceDown = 5, faceUp = 21) {
  await sheet.faceDown().fill(String(faceDown));
  await sheet.faceUp().fill(String(faceUp));
  await sheet.cell(2, 1).fill("14");
  await sheet.cell(3, 1).fill("11");
}

/** An Automa game on the sheet: Jordan 76, the Automa 66 (Eagle). */
async function automaGame(page: Page) {
  const sheet = await openApp(page);
  await sheet.mode("Automa");
  await fillJordan(sheet);
  await fillAutoma(sheet);
  return sheet;
}

test.describe("the corner menu", () => {
  test("switches between Multiplayer, the Automa and Solo", async ({ page }) => {
    const sheet = await openApp(page);
    await expect(sheet.title()).toHaveText("Multiplayer");
    await sheet.mode("Automa");
    await noDialog(page);
    await expect(sheet.title()).toHaveText("Automa");
    await expect(sheet.players()).toHaveCount(1);
    await expect(sheet.automaHead()).toHaveText("Automa");
    await expect(sheet.addPlayer()).toHaveCount(0);
    // It scores no bonus cards, food or tucked cards.
    for (const row of [1, 4, 5]) await expect(sheet.cell(row, 1)).toHaveCount(0);
    await sheet.mode("Solo");
    await expect(sheet.title()).toHaveText("Solo");
    await expect(sheet.automaHead()).toHaveCount(0);
    await expect(sheet.players()).toHaveCount(1);
    await sheet.mode("Multiplayer");
    await expect(sheet.title()).toHaveText("Multiplayer");
    await expect(sheet.players()).toHaveCount(2);
  });

  test("keeps the difficulty when the Automa comes back", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.mode("Automa", "Eagle-eyed Eagle");
    await sheet.mode("Solo");
    await sheet.mode("Automa");
    await sheet.modeButton().click();
    await expect(
      sheet.modeMenu().getByRole("radio", { name: "Eagle-eyed Eagle" })
    ).toBeChecked();
  });

  test("asks before the Automa's scores go, and Cancel keeps them", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.modeButton().click();
    await sheet.modeMenu().getByRole("radio", { name: "Multiplayer" }).click();
    await respond(page, "Remove the Automa's column and its scores?", "Cancel");
    await expect(sheet.faceUp()).toHaveValue("21");
    await sheet.modeMenu().getByRole("radio", { name: "Solo" }).click();
    await respond(page, "Remove the Automa's column and its scores?", "Remove columns");
    await expect(sheet.automaHead()).toHaveCount(0);
    await expect(sheet.cell(0, 0)).toHaveValue("38");
  });

  test("asks before players with scores go", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.cell(0, 1).fill("5");
    await sheet.modeButton().click();
    await sheet.modeMenu().getByRole("radio", { name: "Automa" }).click();
    await respond(page, /one player/, "Remove columns");
    await expect(sheet.players()).toHaveCount(1);
    await expect(sheet.automaHead()).toBeVisible();
  });

  test("asks before tokens in a hidden row go with the Automa", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.mode("Automa");
    await sheet.expansions(["Asia"]);
    await sheet.cell(4, 1).fill("6");
    await sheet.expansions([]);
    await sheet.modeButton().click();
    await sheet.modeMenu().getByRole("radio", { name: "Solo" }).click();
    await respond(page, "Remove the Automa's column and its scores?", "Remove columns");
    await expect(sheet.automaHead()).toHaveCount(0);
  });

  test("asks before a player's score in a hidden row goes", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    const forest = (await sheet.rowLabels()).indexOf("forest");
    await sheet.cell(forest, 1).fill("2");
    await sheet.expansions([]);
    await sheet.modeButton().click();
    await sheet.modeMenu().getByRole("radio", { name: "Automa" }).click();
    await respond(page, /one player/, "Cancel");
    await expect(sheet.players()).toHaveCount(2);
  });

  test("leaves Flock for the Automa or Solo", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await sheet.mode("Automa");
    await expect(sheet.title()).toHaveText("Automa");
    await expect(sheet.players()).toHaveCount(1);
    await expect(sheet.expansionsTab()).toHaveText(/^Asia/);
  });

  test("the menu fits a short screen, scrolling inside", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    const sheet = await openApp(page);
    await sheet.mode("Automa");
    await sheet.modeButton().click();
    const box = await sheet.modeMenu().boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(360);
    await sheet.modeMenu().getByRole("button", { name: "Done" }).scrollIntoViewIfNeeded();
    await sheet.modeMenu().getByRole("button", { name: "Done" }).click();
    await expect(sheet.modeMenu()).toHaveCount(0);
  });

  test("closes when the window is resized", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.modeButton().click();
    await expect(sheet.modeMenu()).toBeVisible();
    await page.setViewportSize({ width: 700, height: 700 });
    await expect(sheet.modeMenu()).toHaveCount(0);
  });

  test("offers the Hoard variant only without Asia or Americas", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.mode("Automa");
    await sheet.modeButton().click();
    await sheet.modeMenu().getByRole("checkbox", { name: "Hoard" }).check();
    await sheet.modeMenu().getByRole("button", { name: "Done" }).click();
    expect(await sheet.rowLabels()).toContain("eggs from cache/hoard");
    await sheet.expansions(["Asia"]);
    await sheet.modeButton().click();
    await expect(sheet.modeMenu().getByRole("checkbox", { name: "Hoard" })).toHaveCount(0);
    expect(await sheet.rowLabels()).toContain("eggs from cache/hoard");
  });
});

test.describe("an Automa game", () => {
  test("scores face-down birds by difficulty and names who won", async ({ page }) => {
    const sheet = await automaGame(page);
    expect(await sheet.totals()).toEqual(["76", "66"]);
    await expect(sheet.result()).toHaveText("Jordan beat the Automa, 76 to 66");
    await sheet.mode("Automa", "Eagle-eyed Eagle");
    expect(await sheet.totals()).toEqual(["76", "71"]);
    await sheet.faceDown().fill("8");
    expect(await sheet.totals()).toEqual(["76", "86"]);
    await expect(sheet.result()).toHaveText("The Automa won with 86");
  });

  test("waits for both bird boxes", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.faceDown().fill("");
    await expect(sheet.result()).toHaveText("1 box left to fill");
  });

  test("counts the Automa's cache as eggs, and its leftover tokens break a tie", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.expansions(["Asia"]);
    // Eagle: 1 egg per 4 tokens. 11 tokens make 2 eggs, 3 left over.
    await sheet.cell(4, 1).fill("11");
    await expect(page.locator(".cache-eggs")).toHaveText("= 2 eggs");
    // Jordan's 76 against the Automa's 68: make it a tie.
    await sheet.cell(0, 0).fill("30");
    expect(await sheet.totals()).toEqual(["68", "68"]);
    await expect(page.locator(".automa-tiebreak")).toHaveText("3tokens left");
    await sheet.cell(7, 0).fill("3");
    await expect(sheet.result()).toContainText("Jordan and the Automa shared the win with 68");
    await sheet.cell(7, 0).fill("4");
    await expect(sheet.result()).toContainText("Jordan beat the Automa on the tiebreak");
  });

  test("gives the Automa 2 food in a tie without cache or hoard", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.cell(0, 0).fill("28");
    await expect(page.locator(".automa-tiebreak")).toHaveText("2food");
    await sheet.cell(6, 0).fill("1");
    await expect(sheet.result()).toContainText("The Automa won with 66");
    await expect(sheet.result()).toContainText("the Automa won the tiebreak, 1 unused food to the Automa's 2 food");
  });

  test("competes for nectar with Oceania", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.expansions(["Oceania"]);
    const labels = await sheet.rowLabels();
    const forest = labels.indexOf("forest");
    await sheet.cell(forest, 0).fill("1");
    await sheet.cell(forest, 1).fill("2");
    // The Automa has the most in the forest: 5 to Jordan's 2.
    expect(await sheet.totals()).toEqual(["78", "71"]);
  });

  test("Enter walks both bird boxes, then skips the rows it doesn't score", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.mode("Automa");
    await sheet.cell(5, 0).click();
    await page.keyboard.press("Enter");
    await expect(sheet.faceDown()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(sheet.faceUp()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(sheet.cell(2, 1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(sheet.faceUp()).toBeFocused();
    await page.keyboard.press("Shift+Enter");
    await expect(sheet.faceDown()).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(sheet.faceDown()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(sheet.cell(0, 0)).toBeFocused();
  });

  test("Base keeps the Automa; Flock ends it", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.mode("Automa");
    await sheet.expansions(["Oceania"]);
    await sheet.baseTab().locator("button").click();
    await expect(sheet.automaHead()).toBeVisible();
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await expect(sheet.automaHead()).toHaveCount(0);
    await expect(sheet.players()).toHaveCount(6);
  });

  test("Duet plays against the Automa; Solo leaves Duet", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await sheet.mode("Automa");
    await expect(sheet.title()).toHaveText("Duet · Automa");
    expect(await sheet.rowLabels()).toContain("duet tokens");
    await sheet.mode("Solo");
    await expect(sheet.title()).toHaveText("Solo");
    await expect(sheet.expansionsTab()).toHaveText(/^Asia/);
  });

  test("Clear wipes both columns", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.clear().click();
    await respond(page, /Clear the sheet/, "Clear");
    await expect(sheet.cell(0, 0)).toHaveValue("");
    await expect(sheet.faceUp()).toHaveValue("");
    await expect(sheet.automaHead()).toBeVisible();
  });
});

test.describe("an ended Automa game", () => {
  test("is saved with the Automa, and Undo puts every box back", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.endButton().click();
    await expect(sheet.lastGame()).toContainText("Jordan beat the Automa, 76 to 66");
    const [saved] = await history(page);
    expect(saved.automa.total).toBe(66);
    await expect(sheet.faceUp()).toHaveValue("");
    await expect(sheet.automaHead()).toBeVisible();
    await page.reload();
    await sheet.undo().click();
    await expect(sheet.faceDown()).toHaveValue("5");
    await expect(sheet.faceUp()).toHaveValue("21");
    await expect(sheet.cell(3, 1)).toHaveValue("11");
    expect(await history(page)).toHaveLength(0);
  });

  test("shows the Automa in Past games, and can be edited", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.faceUp().fill("41");
    await sheet.endButton().click();
    await sheet.pastButton().click();
    const slip = page.locator("button.past-slip").first();
    await expect(slip).toContainText("vs Automa (Eagle)");
    await expect(slip.locator(".past-scores")).toHaveText(/JOR\s*76\s*Automa\s*86/);
    await slip.click();
    await expect(full(page).locator(".automa-head")).toHaveText("Automa");
    await expect(full(page).locator(".leader")).toHaveText("86");
    await full(page).getByRole("button", { name: "Edit" }).click();
    await page.locator("#past-cell-0-1-up").fill("11");
    await full(page).getByRole("button", { name: "Save changes" }).click();
    await expect(full(page).locator(".sheet-result")).toHaveText("Jordan beat the Automa, 76 to 56");
  });

  test("an edit to the Automa's column in another tab blocks saving over it", async ({ page, context }) => {
    const sheet = await automaGame(page);
    await sheet.endButton().click();
    await sheet.pastButton().click();
    await page.locator("button.past-slip").first().click();
    await full(page).getByRole("button", { name: "Edit" }).click();
    const other = await context.newPage();
    await other.goto("/");
    await other.locator(".history-link").click();
    await other.locator("button.past-slip").first().click();
    await other.locator(".past-slip-full").getByRole("button", { name: "Edit" }).click();
    await other.locator("#past-cell-2-1").fill("20");
    await other.locator(".past-slip-full").getByRole("button", { name: "Save changes" }).click();
    await expect(full(page).getByRole("alert")).toContainText("changed in another tab");
    await expect(full(page).getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("Play again starts a fresh Automa game, at its difficulty", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.mode("Automa", "Eagle-eyed Eagle");
    await sheet.endButton().click();
    // Remembered as Eagle here, so Play again has to bring Eagle-eyed back.
    await sheet.mode("Automa", "Eagle");
    await sheet.mode("Multiplayer");
    await sheet.pastButton().click();
    await page.locator("button.past-slip").first().click();
    await full(page).getByRole("button", { name: "Play again with these players" }).click();
    await expect(sheet.title()).toHaveText("Automa");
    await expect(sheet.faceUp()).toHaveValue("");
    expect(await sheet.codes()).toEqual(["JOR"]);
    // Leaving the Automa and coming back keeps that difficulty.
    await sheet.mode("Solo");
    await sheet.mode("Automa");
    await sheet.modeButton().click();
    await expect(
      sheet.modeMenu().getByRole("radio", { name: "Eagle-eyed Eagle" })
    ).toBeChecked();
  });
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("an Automa game ends and comes back with Undo", async ({ page }) => {
    const sheet = await automaGame(page);
    await sheet.endButton().click();
    await expect(page.locator(".scorepad")).toHaveAttribute("inert");
    await expect(page.locator(".scorepad")).not.toHaveAttribute("inert");
    await expect(sheet.faceUp()).toHaveValue("");
    await sheet.undo().click();
    await expect(sheet.faceUp()).toHaveValue("21");
    await expect(page.locator(".scorepad")).not.toHaveAttribute("inert");
  });
});
