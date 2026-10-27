import { expect, test as base, type Page } from "@playwright/test";

export const KEYS = {
  current: "wingspan-scoresheet:v1:current",
  history: "wingspan-scoresheet:v1:history",
  edition: "wingspan-edition",
  palette: "wingspan-palette",
};

/** Every test fails if the page logs an error or warning, or throws. */
export const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", m => {
        if (m.type() === "error" || m.type() === "warning")
          problems.push(`${m.type()}: ${m.text()}`);
      });
      page.on("pageerror", e => problems.push(`pageerror: ${e.message}`));
      await use(problems);
      expect(problems, "console errors or warnings").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Opens the app with exactly this in storage (nothing, by default). */
export async function openApp(
  page: Page,
  storage: Record<string, unknown> = {}
) {
  await page.goto("/");
  await page.evaluate(entries => {
    localStorage.clear();
    for (const [k, v] of Object.entries(entries))
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  }, storage);
  await page.reload();
  await expect(page.locator("#sum-table")).toBeVisible();
  return new Sheet(page);
}

export const readStorage = (page: Page, key: string) =>
  page.evaluate(k => {
    const raw = localStorage.getItem(k);
    return raw === null ? null : JSON.parse(raw);
  }, key);

type Box = "European" | "Oceania" | "Asia" | "Americas";

/** The score sheet and the controls around it, as a player sees them. */
export class Sheet {
  constructor(readonly page: Page) {}

  name = (col: number) => this.page.locator(`#name-${col}`);
  cell = (row: number, col: number) => this.page.locator(`#cell-${row}-${col}`);
  players = () => this.page.locator(".player-input");
  result = () => this.page.locator(".sheet-result");
  totalRow = () => this.page.locator(".total-row td");
  addPlayer = () => this.page.locator(".add-player");
  removeButtons = () => this.page.locator(".remove-player");
  title = () => this.page.locator("#sum-table .sheet-title");
  saveButton = () => this.page.locator(".sheet-actions .ink-button").first();
  newGameButton = () =>
    this.page.getByRole("button", { name: "New game", exact: true });
  pastButton = () => this.page.locator(".history-link");
  baseTab = () => this.page.locator(".expansion-tab.tab-base");
  expansionsTab = () => this.page.locator(".expansion-tab").nth(1);
  checklist = () => this.page.locator(".mix-popover");

  async setName(col: number, name: string) {
    await this.name(col).click();
    await this.name(col).fill(name);
    await this.name(col).press("Enter");
  }

  async codes() {
    return this.players().evaluateAll(els =>
      els.map(e => (e as HTMLInputElement).value)
    );
  }

  async rowLabels() {
    return this.page
      .locator("#sum-table tbody tr:not(.tiebreak-row) .row-label span")
      .allTextContents()
      .then(t => t.map(s => s.trim().toLowerCase()));
  }

  async rowCount() {
    return (await this.rowLabels()).length;
  }

  /** Fills one player's column top to bottom; null leaves a box alone. */
  async fillColumn(col: number, values: (number | string | null)[]) {
    for (const [row, v] of values.entries())
      if (v !== null) await this.cell(row, col).fill(String(v));
  }

  /** Every score row for this player set to `value` (nectar rows skipped). */
  async fillEvery(col: number, value: number | string) {
    const labels = await this.rowLabels();
    for (const [row, label] of labels.entries())
      if (!["forest", "grassland", "wetland"].includes(label))
        await this.cell(row, col).fill(String(value));
  }

  async totals() {
    return this.totalRow().evaluateAll(tds =>
      tds
        .filter(td => !td.classList.contains("add-cell"))
        .map(td => td.textContent?.trim() ?? "")
    );
  }

  circled = () => this.page.locator(".total-row .leader");

  /** Ticks exactly these expansions in the checklist, then closes it. */
  async expansions(boxes: Box[], { close = true } = {}) {
    if (!(await this.checklist().isVisible()))
      await this.expansionsTab().locator("button").click();
    const all: Box[] = ["European", "Oceania", "Asia", "Americas"];
    const box = (b: Box) =>
      this.checklist().locator(".mix-option", { hasText: b }).locator("input");
    for (const b of boxes) if (!(await box(b).isChecked())) await box(b).click();
    for (const b of all)
      if (!boxes.includes(b) && (await box(b).isChecked())) await box(b).click();
    if (close) await this.checklist().getByRole("button", { name: "Done" }).click();
  }

  async asiaMode(mode: "standard" | "duet" | "flock") {
    if (!(await this.checklist().isVisible()))
      await this.expansionsTab().locator("button").click();
    await this.checklist().locator("select").selectOption(mode);
  }

  edition = () =>
    this.page.evaluate(() => document.documentElement.dataset.edition);
}

/** Waits for the in-app dialog showing `message`, then presses `button`. */
export async function respond(
  page: Page,
  message: string | RegExp,
  button: string
) {
  const dialog = page
    .locator("dialog[open]")
    .filter({ has: page.locator(".app-dialog-message", { hasText: message }) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export const noDialog = (page: Page) =>
  expect(page.locator("dialog[open]")).toHaveCount(0);

/** A finished two-player base game: Jordan 60, Sam 30. */
export async function playQuickGame(sheet: Sheet, a = "Jordan", b = "Sam") {
  await sheet.setName(0, a);
  await sheet.setName(1, b);
  await sheet.fillColumn(0, [10, 10, 10, 10, 10, 10]);
  await sheet.fillColumn(1, [5, 5, 5, 5, 5, 5]);
}
