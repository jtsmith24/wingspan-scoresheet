import { expect, noDialog, openApp, readStorage, respond, test, KEYS } from "./helpers";

const BASE_ROWS = 6;

test.describe("Expansions tab", () => {
  test("European: Expansions raised in its colour, Base tucked", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["European"]);
    await expect(sheet.expansionsTab()).toHaveClass(/is-on/);
    await expect(sheet.expansionsTab()).toHaveClass(/tab-european/);
    await expect(sheet.baseTab()).not.toHaveClass(/is-on/);
    await expect(sheet.baseTab().locator("button")).toHaveAttribute("aria-pressed", "false");
    await expect(sheet.expansionsTab()).toContainText("European");
    expect(await sheet.edition()).toBe("european");
    // European adds cards, not rows.
    expect(await sheet.rowCount()).toBe(BASE_ROWS);
  });

  test("names every box in play; Asia names its mode", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["European", "Oceania"]);
    await expect(sheet.expansionsTab()).toContainText("European + Oceania");
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await expect(sheet.expansionsTab()).toContainText("Asia · Duet");
    await sheet.asiaMode("standard");
    await expect(sheet.expansionsTab().locator(".tab-long")).toHaveText("Asia");
  });

  test("Base clears every expansion and closes the checklist", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania", "Americas"], { close: false });
    await sheet.baseTab().locator("button").click();
    await expect(sheet.checklist()).toHaveCount(0);
    await expect(sheet.baseTab()).toHaveClass(/is-on/);
    await expect(sheet.expansionsTab()).toHaveText(/Expansions/);
    expect(await sheet.rowCount()).toBe(BASE_ROWS);
    expect(await sheet.edition()).toBe("base");
  });

  test("checklist closes on Escape, outside tap, Done and its own tab", async ({ page }) => {
    const sheet = await openApp(page);
    const open = () => sheet.expansionsTab().locator("button").click();
    await open();
    await page.keyboard.press("Escape");
    await expect(sheet.checklist()).toHaveCount(0);
    await open();
    await page.locator(".wordmark").click();
    await expect(sheet.checklist()).toHaveCount(0);
    await open();
    await open();
    await expect(sheet.checklist()).toHaveCount(0);
    await open();
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await expect(sheet.checklist()).toHaveCount(0);
  });

  test("the choice is still there after a reload", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania", "Americas"]);
    await page.reload();
    await expect(sheet.expansionsTab()).toContainText("Oceania + Americas");
    expect(await sheet.edition()).toBe("mix");
  });

  test("one expansion has its own palette; several mix, whatever the order", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    expect(await sheet.edition()).toBe("americas");
    expect((await sheet.washes())[3]).toBe("transparent");
    await sheet.expansions(["Americas", "European"]);
    expect(await sheet.edition()).toBe("mix");
    await expect(sheet.expansionsTab()).toHaveClass(/tab-blend/);
    // Each expansion brings its own cloud: main colours first, checklist order.
    expect(await sheet.washes()).toEqual(["#a49ad3", "#97c79a", "#cdbfe6", "#cfe3b8"]);
    const mixed = await sheet.washes();
    await sheet.expansions([]);
    await sheet.expansions(["European"]);
    await sheet.expansions(["European", "Americas"]);
    expect(await sheet.washes()).toEqual(mixed);
    await sheet.expansions(["Americas"]);
    expect(await sheet.edition()).toBe("americas");
    await expect(sheet.expansionsTab()).toHaveClass(/tab-americas/);
    expect(await sheet.washes()).toEqual(["#97c79a", "#cfe3b8", "#f2d89b", "transparent"]);
    await sheet.expansions([]);
    expect(await sheet.edition()).toBe("base");
  });
});

test.describe("Oceania nectar", () => {
  test("adds three habitats scored 5 / 2 by majority", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.expansions(["Oceania"]);
    expect((await sheet.rowLabels()).slice(BASE_ROWS)).toEqual(["forest", "grassland", "wetland"]);
    const forest = BASE_ROWS;
    await sheet.cell(forest, 0).fill("3");
    await sheet.cell(forest, 1).fill("1");
    const marks = page.locator(".nectar-points");
    await expect(marks).toHaveText(["+5", "+2"]);
    expect(await sheet.totals()).toEqual(["5", "2", ""]);
  });

  test("tied for first: split 5+2 rounded down, nobody second", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.expansions(["Oceania"]);
    await sheet.cell(BASE_ROWS, 0).fill("2");
    await sheet.cell(BASE_ROWS, 1).fill("2");
    await sheet.cell(BASE_ROWS, 2).fill("1");
    // Third place scores nothing, but they did spend nectar.
    expect(await sheet.totals()).toEqual(["3", "3", "0"]);
  });

  test("nectar boxes may stay blank: they don't hold up the winner", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await sheet.fillEvery(0, 1);
    await sheet.fillEvery(1, 2);
    await expect(sheet.result()).toHaveText("Player 2 won with 12");
  });

  test("nectar-only player still gets a total", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await sheet.cell(BASE_ROWS + 1, 1).fill("4");
    expect(await sheet.totals()).toEqual(["", "5"]);
  });
});

test.describe("Americas", () => {
  test("hummingbirds row takes negatives", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    expect(await sheet.rowLabels()).toContain("hummingbirds");
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).pressSequentially("-4");
    // The box shows the digits; the sign tab shows the minus.
    await expect(sheet.cell(row, 0)).toHaveValue("4");
    await expect(sheet.cell(row, 0)).toHaveClass(/is-negative/);
    await sheet.cell(0, 0).fill("10");
    expect((await sheet.totals())[0]).toBe("6");
  });

  test("the sign tab switches a hummingbird score between plus and minus", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    const cell = sheet.cell(row, 0);
    const tab = page.locator(".score-cell").filter({ has: cell }).locator(".sign-tab");
    // Number pad and digits only, like every other box.
    await expect(cell).toHaveAttribute("inputmode", "numeric");
    await cell.pressSequentially("5/x.");
    await expect(cell).toHaveValue("5");
    await expect(tab).toHaveText("+");
    await tab.click();
    await expect(tab).toHaveText("−");
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await expect(cell).toHaveAttribute("aria-label", /, minus$/);
    await expect(cell).toHaveValue("5");
    expect((await sheet.totals())[0]).toBe("-5");
    // Pressed while typing, the tab leaves the box focused (keyboard up),
    // and typing carries on from the same number.
    await expect(cell).toBeFocused();
    await cell.press("2");
    expect((await sheet.totals())[0]).toBe("-52");
    await tab.click();
    expect((await sheet.totals())[0]).toBe("52");
  });

  test("the sign tab on a box not being typed in leaves the keyboard down", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 1).fill("4");
    // Typing in another box: the tab puts the keyboard away.
    await sheet.cell(0, 0).click();
    const tab = page.locator(".score-cell").filter({ has: sheet.cell(row, 1) }).locator(".sign-tab");
    await tab.click();
    await expect(tab).toHaveText("−");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("INPUT");
    // Nothing focused: it stays that way.
    await tab.click();
    await expect(tab).toHaveText("+");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("INPUT");
  });

  test("minus first: the sign stays for the digits typed after it", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    const tab = page.locator(".score-cell").filter({ has: sheet.cell(row, 1) }).locator(".sign-tab");
    await tab.click();
    await expect(tab).toHaveText("−");
    await sheet.cell(row, 1).fill("3");
    expect((await sheet.totals())[1]).toBe("-3");
    // On a keyboard, the minus key switches it too.
    await sheet.cell(row, 1).press("-");
    await expect(tab).toHaveText("+");
    expect((await sheet.totals())[1]).toBe("3");
  });

  test("a negative score is kept through a reload and into Past games", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    await sheet.fillEvery(0, 1);
    await sheet.fillEvery(1, 1);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await page.locator(".score-cell").filter({ has: sheet.cell(row, 0) }).locator(".sign-tab").click();
    await page.reload();
    expect((await sheet.totals())[0]).toBe("5");
    await sheet.endButton().click();
    const [game] = await readStorage(page, KEYS.history);
    expect(game.players[0].breakdown.hummingbirds).toBe(-1);
  });

  test("Flock mode drops the hummingbird row, with a note; Standard brings it back", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas", "Asia"]);
    let row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).fill("4");
    await sheet.cell(0, 0).fill("10");
    expect((await sheet.totals())[0]).toBe("14");
    const note = page.locator(".sheet-footnote");
    await expect(note).toHaveCount(0);
    await sheet.asiaMode("flock");
    await page.keyboard.press("Escape");
    expect(await sheet.rowLabels()).not.toContain("hummingbirds");
    expect((await sheet.totals())[0]).toBe("10");
    await expect(note).toHaveText("* No hummingbird track with 6–7 players (Flock). Americas birds still play.");
    // The asterisk ties the tab and the menu's Americas to the footnote,
    // without being read out as part of the tab's name.
    await expect(sheet.expansionsTab()).toContainText("Americas*");
    await expect(sheet.expansionsTab().locator("button")).toHaveAttribute(
      "aria-label",
      "Expansions: Asia · Flock + Americas"
    );
    await sheet.expansionsTab().locator("button").click();
    await expect(sheet.checklist().locator(".mix-option", { hasText: "Americas" })).toContainText("Americas*");
    await sheet.asiaMode("standard");
    await expect(note).toHaveCount(0);
    await expect(sheet.checklist().locator(".footnote-mark")).toHaveCount(0);
    await page.keyboard.press("Escape");
    row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await expect(sheet.expansionsTab()).not.toContainText("*");
    await expect(sheet.cell(row, 0)).toHaveValue("4");
    expect((await sheet.totals())[0]).toBe("14");
  });

  test("a Flock game saved with a hidden hummingbird score keeps its total when edited", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).fill("9");
    await sheet.expansions(["Americas", "Asia"], { close: false });
    await sheet.asiaMode("flock");
    await page.keyboard.press("Escape");
    for (let c = 0; c < 6; c++) await sheet.fillEvery(c, 10 + c);
    expect((await sheet.totals())[0]).toBe("60");
    await sheet.endButton().click();
    const [saved] = await readStorage(page, KEYS.history);
    expect(saved.players[0].total).toBe(60);
    await sheet.pastButton().click();
    await page.locator("button.past-slip").click();
    await page.locator(".past-actions").getByRole("button", { name: "Edit" }).click();
    expect(
      await page.locator(".past-drawer .row-label").allTextContents()
    ).not.toContain("Hummingbirds");
    await page.locator("#past-cell-0-0").fill("11");
    await page.getByRole("button", { name: "Save changes" }).click();
    const [edited] = await readStorage(page, KEYS.history);
    expect(edited.players[0].total).toBe(61);
    expect(edited.players[0].breakdown.hummingbirds).toBeUndefined();
  });

  test("tapping a sign tab while typing elsewhere: nothing moves mid-tap, then it flips and the keyboard goes", async ({ page }, info) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    const tab = page.locator(".score-cell").filter({ has: sheet.cell(row, 1) }).locator(".sign-tab");
    const focusedInput = () =>
      page.evaluate(() => (document.activeElement instanceof HTMLInputElement ? document.activeElement.id : null));
    // Typing in another box, as on a phone with the keyboard up.
    await sheet.cell(0, 0).click();
    // Pressing the tab leaves that box focused, so the keyboard can't close
    // and move the tab out from under the finger before the tap completes.
    await tab.dispatchEvent("pointerdown", { button: 0, pointerType: "touch", isPrimary: true });
    expect(await focusedInput()).toBe("cell-0-0");
    // The whole tap (a real touch on the phone run) flips it, then no box keeps the keyboard.
    if (info.project.name === "phone") await tab.tap();
    else await tab.click();
    await expect(tab).toHaveText("−");
    expect(await focusedInput()).toBeNull();
    // A screen reader's click, with no pointer, flips it too.
    await tab.evaluate(el => (el as HTMLElement).click());
    await expect(tab).toHaveText("+");
  });

  test("flipping a sign on an empty sheet doesn't start the game", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    const tab = page.locator(".score-cell").filter({ has: sheet.cell(row, 0) }).locator(".sign-tab");
    await tab.click();
    await expect(tab).toHaveText("−");
    expect(await sheet.totals()).toEqual(["", ""]);
    await expect(sheet.endButton()).toBeDisabled();
    await sheet.cell(row, 0).fill("3");
    expect((await sheet.totals())[0]).toBe("-3");
    await expect(sheet.endButton()).toBeEnabled();
    // Deleting the digits leaves just the sign: back to an empty sheet.
    await sheet.cell(row, 0).fill("");
    await expect(tab).toHaveText("−");
    expect(await sheet.totals()).toEqual(["", ""]);
    await expect(sheet.endButton()).toBeDisabled();
  });

  test("a lone minus counts as blank", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    await sheet.fillEvery(0, 1);
    await sheet.fillEvery(1, 1);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 1).fill("");
    await sheet.cell(row, 1).press("-");
    await expect(sheet.result()).toHaveText("1 box left to fill");
  });

  test("a negative total is shown as negative", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).fill("-7");
    expect((await sheet.totals())[0]).toBe("-7");
  });
});

test.describe("Asia modes", () => {
  test("Duet: two players, a Duet tokens row, no adding or removing", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await expect(sheet.title()).toHaveText("Duet");
    await expect(sheet.players()).toHaveCount(2);
    expect(await sheet.rowLabels()).toContain("duet tokens");
    await expect(sheet.addPlayer()).toHaveCount(0);
    await expect(sheet.removeButtons()).toHaveCount(0);
  });

  test("Duet from four scored players asks before trimming", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.addPlayer().click();
    for (let c = 0; c < 4; c++) await sheet.cell(0, c).fill(String(c + 1));
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await respond(page, "This mode is for up to 2 players. Remove the extra columns and their scores?", "Cancel");
    await expect(sheet.players()).toHaveCount(4);
    await expect(sheet.checklist().locator("select")).toHaveValue("standard");
    await sheet.asiaMode("duet");
    await respond(page, /up to 2 players/, "Remove columns");
    await expect(sheet.players()).toHaveCount(2);
    await expect(sheet.cell(0, 1)).toHaveValue("2");
  });

  test("Duet with empty extra columns trims without asking", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await sheet.addPlayer().click();
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await noDialog(page);
    await expect(sheet.players()).toHaveCount(2);
  });

  test("Flock: pads to six, allows seven, then back to five asks", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("flock");
    await sheet.checklist().getByRole("button", { name: "Done" }).click();
    await expect(sheet.title()).toHaveText("Flock");
    await expect(sheet.players()).toHaveCount(6);
    await expect(sheet.removeButtons()).toHaveCount(0);
    await sheet.addPlayer().click();
    await expect(sheet.players()).toHaveCount(7);
    await expect(sheet.addPlayer()).toHaveCount(0);
    await expect(sheet.removeButtons()).toHaveCount(7);
    await sheet.cell(0, 6).fill("9");
    await sheet.asiaMode("standard");
    await respond(page, /up to 5 players/, "Remove columns");
    await expect(sheet.players()).toHaveCount(5);
  });

  test("Flock nectar ties are friendly: every tied player gets full points", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania", "Asia"], { close: false });
    await sheet.asiaMode("flock");
    const forest = (await sheet.rowLabels()).indexOf("forest");
    await sheet.cell(forest, 0).fill("3");
    await sheet.cell(forest, 1).fill("3");
    await sheet.cell(forest, 2).fill("1");
    expect((await sheet.totals()).slice(0, 3)).toEqual(["5", "5", "2"]);
  });

  test("turning Asia off from Duet frees the player count", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Asia"], { close: false });
    await sheet.asiaMode("duet");
    await sheet.expansions([]);
    await expect(sheet.addPlayer()).toBeVisible();
    await expect(sheet.title()).toHaveText("Multiplayer");
    expect(await sheet.rowLabels()).not.toContain("duet tokens");
  });
});

test.describe("switching boxes mid-game", () => {
  test("scores in a hidden row come back when the box is ticked again", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).fill("6");
    await sheet.expansions([]);
    expect(await sheet.totals()).toEqual(["", ""]);
    await expect(sheet.endButton()).toBeDisabled();
    await sheet.expansions(["Americas"]);
    await expect(sheet.cell(row, 0)).toHaveValue("6");
    expect((await sheet.totals())[0]).toBe("6");
  });

  test("hidden rows don't count towards a saved game", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Americas"]);
    const row = (await sheet.rowLabels()).indexOf("hummingbirds");
    await sheet.cell(row, 0).fill("6");
    await sheet.expansions([]);
    await sheet.fillEvery(0, 1);
    await sheet.fillEvery(1, 2);
    await sheet.endButton().click();
    const [saved] = await readStorage(page, KEYS.history);
    expect(saved.players[0].total).toBe(6);
    expect(saved.players[0].breakdown.hummingbirds).toBeUndefined();
  });
});
