import { expect, noDialog, openApp, respond, test } from "./helpers";

test.describe("a fresh sheet", () => {
  test("starts as a blank two-player base game", async ({ page }) => {
    const sheet = await openApp(page);
    await expect(sheet.players()).toHaveCount(2);
    expect(await sheet.codes()).toEqual(["", ""]);
    await expect(sheet.name(0)).toHaveAttribute("placeholder", "P1");
    await expect(sheet.title()).toHaveText("Multiplayer");
    expect(await sheet.rowLabels()).toEqual([
      "birds",
      "bonus cards",
      "end-of-round goals",
      "eggs",
      "food on cards",
      "tucked cards",
    ]);
    await expect(sheet.baseTab()).toHaveClass(/is-on/);
    await expect(sheet.expansionsTab()).not.toHaveClass(/is-on/);
    await expect(sheet.saveButton()).toBeDisabled();
    await expect(sheet.newGameButton()).toBeDisabled();
    await expect(sheet.pastButton()).toHaveCount(0);
    await expect(sheet.result()).toHaveCount(0);
    expect(await sheet.totals()).toEqual(["", ""]);
    expect(await sheet.edition()).toBe("base");
  });
});

test.describe("names", () => {
  test("a full name shows while typing and a code after", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.name(0).click();
    await sheet.name(0).fill("Jordan");
    await expect(sheet.name(0)).toHaveValue("Jordan");
    await expect(sheet.name(0)).toHaveClass(/is-editing/);
    await sheet.name(0).press("Enter");
    await expect(sheet.name(0)).not.toBeFocused();
    await expect(sheet.name(0)).toHaveValue("JOR");
    // Tapping it again brings back the full name to edit.
    await sheet.name(0).click();
    await expect(sheet.name(0)).toHaveValue("Jordan");
  });

  test("Enter closes the name box rather than moving on", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await expect(sheet.name(1)).not.toBeFocused();
    await expect(sheet.cell(0, 0)).not.toBeFocused();
  });

  test("codes for clashing names: first come keeps theirs", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.addPlayer().click();
    await sheet.setName(0, "Samantha");
    await sheet.setName(1, "Sam");
    await sheet.setName(2, "Sam Lee");
    await sheet.setName(3, "Sam");
    // Samantha came first and keeps SAM; the later Sam adapts; the second
    // Sam is numbered.
    expect(await sheet.codes()).toEqual(["SAM", "SM", "SL", "SA2"]);
  });

  test("renaming one player never changes anyone else's code", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Samuel");
    await sheet.setName(1, "Sam");
    const before = await sheet.codes();
    await sheet.setName(0, "Alex");
    const after = await sheet.codes();
    expect(after[1]).toBe(before[1]);
    expect(after[0]).toBe("ALE");
  });

  test("odd names: accents, symbols, spaces, too long", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Zoë");
    expect((await sheet.codes())[0]).toBe("ZOE");
    await sheet.setName(1, "   ");
    expect((await sheet.codes())[1]).toBe("");
    await expect(sheet.newGameButton()).toBeEnabled(); // Zoë counts as something on the sheet
    await sheet.name(1).click();
    await sheet.name(1).fill("A really very long name indeed");
    await expect(sheet.name(1)).toHaveValue("A really very long n");
    await sheet.name(1).press("Enter");
    expect((await sheet.codes())[1]).toBe("ARV");
    await sheet.setName(1, "!!!");
    expect((await sheet.codes())[1]).toBe("");
    await expect(sheet.name(1)).toHaveAttribute("placeholder", "P2");
  });

  test("Arrow Down from a name goes to that player's first score", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.name(1).click();
    await sheet.name(1).press("ArrowDown");
    await expect(sheet.cell(0, 1)).toBeFocused();
  });
});

test.describe("scores", () => {
  test("only whole numbers up to three digits go in", async ({ page }) => {
    const sheet = await openApp(page);
    const box = sheet.cell(0, 0);
    await box.pressSequentially("12a3");
    await expect(box).toHaveValue("123");
    await box.press("End");
    await box.pressSequentially("4");
    await expect(box).toHaveValue("123");
    await box.fill("");
    await box.pressSequentially("-5");
    await expect(box).toHaveValue("5");
    await box.fill("");
    await box.pressSequentially("1.5");
    await expect(box).toHaveValue("15");
  });

  test("totals add up as you go, and a winner waits for every box", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.cell(0, 0).fill("40");
    expect(await sheet.totals()).toEqual(["40", ""]);
    await expect(sheet.result()).toHaveText("11 boxes left to fill");
    await sheet.fillColumn(0, [null, 5, 4, 3, 2, 1]);
    await expect(sheet.result()).toHaveText("6 boxes left to fill");
    await sheet.fillColumn(1, [30, 5, 4, 3, 2]);
    await expect(sheet.result()).toHaveText("1 box left to fill");
    await expect(sheet.circled()).toHaveCount(0);
    await sheet.cell(5, 1).fill("0");
    expect(await sheet.totals()).toEqual(["55", "44"]);
    await expect(sheet.result()).toHaveText("Jordan won with 55");
    await expect(sheet.circled()).toHaveText("55");
  });

  test("an unnamed column nobody wrote in doesn't hold up the result", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.fillColumn(0, [1, 1, 1, 1, 1, 1]);
    await sheet.fillColumn(1, [2, 2, 2, 2, 2, 2]);
    await expect(sheet.result()).toHaveText("Sam won with 12");
  });

  test("a scored player without a name is called Player N", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.fillColumn(0, [1, 1, 1, 1, 1, 1]);
    await sheet.fillColumn(1, [2, 2, 2, 2, 2, 2]);
    await expect(sheet.result()).toHaveText("Player 2 won with 12");
  });

  test("clearing a box takes the winner away again", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.fillColumn(0, [1, 1, 1, 1, 1, 1]);
    await sheet.fillColumn(1, [2, 2, 2, 2, 2, 2]);
    await expect(sheet.result()).toHaveText(/won/);
    await sheet.cell(3, 1).fill("");
    await expect(sheet.result()).toHaveText("1 box left to fill");
    await expect(sheet.circled()).toHaveCount(0);
  });

  test("solo: one player scores against nobody", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.removeButtons().nth(1).click();
    await noDialog(page);
    await expect(sheet.title()).toHaveText("Solo");
    await expect(sheet.removeButtons()).toHaveCount(0);
    await sheet.setName(0, "Jordan");
    await sheet.fillColumn(0, [50, 10, 5, 4, 3, 2]);
    await expect(sheet.result()).toHaveText("Jordan scored 74");
  });
});

test.describe("ties", () => {
  test("a tie asks for unused food, then names the winner", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    for (const [i, n] of ["Jordan", "Sam", "Alex"].entries()) await sheet.setName(i, n);
    await sheet.fillColumn(0, [10, 0, 0, 0, 0, 0]);
    await sheet.fillColumn(1, [10, 0, 0, 0, 0, 0]);
    await sheet.fillColumn(2, [5, 0, 0, 0, 0, 0]);
    await expect(sheet.result()).toContainText("Jordan and Sam tied with 10");
    await expect(sheet.result()).toContainText("enter unused food to break the tie");
    const food = page.locator(".tiebreak-row input");
    await expect(food).toHaveCount(3);
    await expect(food.nth(2)).toBeDisabled();
    await expect(sheet.circled()).toHaveCount(0);
    await food.nth(0).fill("3");
    await food.nth(1).fill("1");
    await expect(sheet.result()).toContainText("Jordan won with 10");
    await expect(sheet.result()).toContainText("Tied with Sam at 10, won on unused food 3 to 1");
    await expect(sheet.circled()).toHaveCount(1);
  });

  test("still tied on food: they share the win", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 2);
    const food = page.locator(".tiebreak-row input");
    await food.nth(0).fill("2");
    await food.nth(1).fill("2");
    await expect(sheet.result()).toContainText("Jordan and Sam shared the win with 12");
    await expect(sheet.circled()).toHaveCount(2);
  });

  test("breaking the tie on points hides the food row", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.fillEvery(0, 2);
    await sheet.fillEvery(1, 2);
    await expect(page.locator(".tiebreak-row")).toBeVisible();
    await sheet.cell(0, 0).fill("9");
    await expect(page.locator(".tiebreak-row")).toHaveCount(0);
    await expect(sheet.result()).toHaveText("Player 1 won with 19");
  });
});

test.describe("players", () => {
  test("add up to five in the base game", async ({ page }) => {
    const sheet = await openApp(page);
    for (let n = 3; n <= 5; n++) {
      await sheet.addPlayer().click();
      await expect(sheet.players()).toHaveCount(n);
    }
    await expect(sheet.addPlayer()).toHaveCount(0);
  });

  test("removing an empty player asks nothing", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.setName(0, "Jordan");
    await sheet.removeButtons().nth(2).click();
    await noDialog(page);
    await expect(sheet.players()).toHaveCount(2);
  });

  test("removing a player with scores asks first", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(1, "Sam");
    await sheet.cell(0, 1).fill("12");
    await sheet.removeButtons().nth(1).click();
    await respond(page, "Remove Sam and their scores?", "Cancel");
    await expect(sheet.players()).toHaveCount(2);
    await expect(sheet.cell(0, 1)).toHaveValue("12");
    await sheet.removeButtons().nth(1).click();
    await respond(page, "Remove Sam and their scores?", "Remove");
    await expect(sheet.players()).toHaveCount(1);
  });

  test("removing the first player shifts the others left, scores intact", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.setName(0, "Jordan");
    await sheet.setName(1, "Sam");
    await sheet.cell(0, 1).fill("33");
    await sheet.removeButtons().nth(0).click();
    await expect(sheet.players()).toHaveCount(1);
    expect(await sheet.codes()).toEqual(["SAM"]);
    await expect(sheet.cell(0, 0)).toHaveValue("33");
  });
});

test.describe("keyboard", () => {
  test("Enter moves down a column and wraps to the next player", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.cell(0, 0).click();
    for (let row = 1; row < 6; row++) {
      await page.keyboard.press("Enter");
      await expect(sheet.cell(row, 0)).toBeFocused();
    }
    await page.keyboard.press("Enter");
    await expect(sheet.cell(0, 1)).toBeFocused();
    await page.keyboard.press("Shift+Enter");
    await expect(sheet.cell(5, 0)).toBeFocused();
  });

  test("arrow keys move around, and Up from the top goes to the name", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.cell(2, 0).click();
    await page.keyboard.press("ArrowRight");
    await expect(sheet.cell(2, 1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(sheet.cell(0, 1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(sheet.name(1)).toBeFocused();
  });

  test("focusing a box selects what's in it, so typing replaces it", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.cell(0, 0).fill("45");
    await sheet.cell(1, 0).click();
    await sheet.cell(0, 0).click();
    await page.keyboard.type("7");
    await expect(sheet.cell(0, 0)).toHaveValue("7");
  });
});
