import { expect, KEYS, openApp, playQuickGame, readStorage, respond, Sheet, test } from "./helpers";

test.describe("keeping things between visits", () => {
  test("a reload keeps the sheet exactly as it was", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.addPlayer().click();
    await playQuickGame(sheet, "Jordan Smith", "Sam");
    await sheet.cell(2, 2).fill("7");
    await page.reload();
    expect(await sheet.codes()).toEqual(["JS", "SAM", ""]);
    await expect(sheet.cell(2, 2)).toHaveValue("7");
    await expect(sheet.saveButton()).toHaveText("Save game");
  });

  test("a saved game is still Saved after a reload", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.saveButton().click();
    await page.reload();
    await expect(sheet.saveButton()).toHaveText("Saved");
    await expect(sheet.pastButton()).toHaveText("Past games · 1");
  });

  test("a name being typed survives a reload", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.name(0).click();
    await sheet.name(0).fill("Jordan");
    await page.reload();
    expect(await sheet.codes()).toEqual(["JOR", ""]);
  });

  test("the palette is on before the app starts: no flash of blue", async ({ page }) => {
    const sheet = await openApp(page);
    await sheet.expansions(["Oceania"]);
    await page.addInitScript(() => {
      new MutationObserver((_, obs) => {
        if (document.body) {
          (window as unknown as { early: string }).early =
            document.documentElement.dataset.edition ?? "none";
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { early: string }).early)).toBe("oceania");
  });
});

test.describe("bad or missing storage", () => {
  for (const [what, value] of [
    ["not JSON", "{oops"],
    ["the wrong shape", JSON.stringify({ players: "many" })],
    ["a bad config", JSON.stringify({ config: { asia: "sometimes" }, players: [] })],
  ]) {
    test(`a current game that's ${what} starts a fresh sheet`, async ({ page }) => {
      const sheet = await openApp(page, { [KEYS.current]: value, [KEYS.history]: value });
      await expect(sheet.players()).toHaveCount(2);
      await expect(sheet.pastButton()).toHaveCount(0);
    });
  }

  test("one bad game in history doesn't break the drawer", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await sheet.saveButton().click();
    const history = await readStorage(page, KEYS.history);
    await page.evaluate(
      ([k, v]) => localStorage.setItem(k, v),
      [KEYS.history, JSON.stringify([...history, { id: 7 }])]
    );
    await page.reload();
    // Invalid history is ignored as a whole rather than half-read.
    await expect(page.locator("#sum-table")).toBeVisible();
  });

  test("an older save without codes still loads and gets codes", async ({ page }) => {
    const sheet = await openApp(page, {
      [KEYS.current]: {
        config: { european: false, oceania: false, asia: "off", americas: false },
        players: [
          { id: "a", name: "Jordan", scores: { birds: "5" }, nectarSpent: {}, unusedFood: "" },
          { id: "b", name: "Sam", scores: {}, nectarSpent: {}, unusedFood: "" },
        ],
      },
    });
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
    await expect(sheet.cell(0, 0)).toHaveValue("5");
  });

  test("storage blocked: everything works for this visit, with a note", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("blocked", "SecurityError");
      };
    });
    await page.goto("/");
    const sheet = new Sheet(page);
    await expect(page.locator(".storage-note")).toBeVisible();
    await playQuickGame(sheet);
    await sheet.saveButton().click();
    await expect(sheet.pastButton()).toHaveText("Past games · 1");
    await sheet.newGameButton().click();
    await respond(page, "New game. Who's playing?", "Same players");
    expect(await sheet.codes()).toEqual(["JOR", "SAM"]);
  });

  test("storage full when saving: kept for this visit, with a note", async ({ page }) => {
    const sheet = await openApp(page);
    await playQuickGame(sheet);
    await page.evaluate(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k.endsWith(":history")) throw new DOMException("full", "QuotaExceededError");
        return real.call(this, k, v);
      };
    });
    await sheet.saveButton().click();
    await expect(sheet.pastButton()).toHaveText("Past games · 1");
    await expect(page.locator(".storage-note")).toBeVisible();
  });
});

test.describe("two tabs open", () => {
  test("a game saved in one shows up in the other", async ({ page, context }) => {
    const a = await openApp(page);
    const other = await context.newPage();
    await other.goto("/");
    const b = new Sheet(other);
    await expect(b.pastButton()).toHaveCount(0);
    await playQuickGame(a);
    await a.saveButton().click();
    await expect(b.pastButton()).toHaveText("Past games · 1");
  });

  test("saving in both keeps both games", async ({ page, context }) => {
    const a = await openApp(page);
    const other = await context.newPage();
    await other.goto("/");
    const b = new Sheet(other);
    await playQuickGame(a, "Alex", "Blake");
    await a.saveButton().click();
    // Tab B's own sheet is the same stored game until it reloads; give it
    // a different game to save.
    await other.reload();
    await b.newGameButton().click();
    await respond(other, "New game. Who's playing?", "New players");
    await playQuickGame(b, "Casey", "Drew");
    await b.saveButton().click();
    const history = await readStorage(page, KEYS.history);
    expect(history).toHaveLength(2);
    await expect(a.pastButton()).toHaveText("Past games · 2");
  });

  test("deleting in one tab removes it from the other", async ({ page, context }) => {
    const a = await openApp(page);
    await playQuickGame(a);
    await a.saveButton().click();
    const other = await context.newPage();
    await other.goto("/");
    const b = new Sheet(other);
    await b.pastButton().click();
    await other.locator("button.past-slip").click();
    await other.locator(".past-actions").getByRole("button", { name: "Delete" }).click();
    await respond(other, /Delete this game/, "Delete");
    await expect(a.pastButton()).toHaveCount(0);
  });
});
