import { beforeEach, describe, expect, it } from "vitest";
import {
  addToHistory,
  fitPlayers,
  missingScores,
  playerHasData,
  isCurrentGame,
  isHistory,
  MAX_HISTORY,
  newGame,
  removeFromHistory,
  toSavedGame,
} from "./game";
import { categoriesFor, DEFAULT_CONFIG, playerLimits } from "./rules";
import { createStore } from "./storage";
import { nextCell } from "./gridNavigation";
import type { PlayerSheet } from "./scoring";

/** Every score row filled in: 0 except birds. */
const fill = (p: PlayerSheet, birds: string) => {
  for (const c of categoriesFor(DEFAULT_CONFIG)) p.scores[c.id] = "0";
  p.scores.birds = birds;
};

describe("scoresheet rows", () => {
  it("matches the base scorepad", () => {
    expect(categoriesFor(DEFAULT_CONFIG).map((c) => c.id)).toEqual([
      "birds",
      "bonus",
      "goals",
      "eggs",
      "food",
      "tucked",
    ]);
  });

  it("adds no rows for the European expansion", () => {
    expect(categoriesFor({ ...DEFAULT_CONFIG, european: true })).toHaveLength(6);
  });

  it("matches the Asia + Oceania duet scorepad order", () => {
    expect(categoriesFor({ ...DEFAULT_CONFIG, oceania: true, asia: "duet" }).map((c) => c.id).slice(-2)).toEqual([
      "duet",
      "nectar",
    ]);
  });

  it("adds a hummingbird row for the Americas, before nectar", () => {
    expect(
      categoriesFor({ ...DEFAULT_CONFIG, oceania: true, americas: true })
        .map(c => c.id)
        .slice(-2)
    ).toEqual(["hummingbirds", "nectar"]);
  });

  it("drops the hummingbird row in Flock mode, where the track isn't used", () => {
    const flock = { ...DEFAULT_CONFIG, americas: true, asia: "flock" as const };
    expect(categoriesFor(flock).map(c => c.id)).not.toContain("hummingbirds");
    expect(categoriesFor({ ...flock, asia: "standard" }).map(c => c.id)).toContain("hummingbirds");
    // A hummingbird score typed before switching to Flock counts for nothing.
    const game = newGame(flock, ["A", "B", "C", "D", "E", "F"]);
    game.players.forEach(p => fill(p, "5"));
    game.players[0].scores.hummingbirds = "9";
    expect(missingScores(game)).toBe(0);
    const saved = toSavedGame(game);
    expect(saved.players[0].total).toBe(5);
    expect(saved.players[0].breakdown.hummingbirds).toBeUndefined();
  });

  it("limits player counts by mode", () => {
    expect(playerLimits(DEFAULT_CONFIG)).toEqual({ min: 1, max: 5 });
    expect(playerLimits({ ...DEFAULT_CONFIG, asia: "duet" })).toEqual({ min: 2, max: 2 });
    expect(playerLimits({ ...DEFAULT_CONFIG, asia: "flock" })).toEqual({ min: 6, max: 7 });
  });
});

describe("games and history", () => {
  it("starts a new game with remembered names", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", "Sam", "Alex"]);
    expect(game.players.map((p) => p.name)).toEqual(["Jordan", "Sam", "Alex"]);
    expect(game.players.every((p) => Object.keys(p.scores).length === 0)).toBe(true);
  });

  it("defaults to two players", () => {
    expect(newGame().players).toHaveLength(2);
  });

  it("fits players to a mode", () => {
    const five = newGame(DEFAULT_CONFIG, ["a", "b", "c", "d", "e"]).players;
    expect(fitPlayers(five, { ...DEFAULT_CONFIG, asia: "duet" }).map((p) => p.name)).toEqual(["a", "b"]);
    expect(fitPlayers(five, { ...DEFAULT_CONFIG, asia: "flock" })).toHaveLength(6);
  });

  it("calls no winner until every box is filled in", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", "Sam", ""]);
    expect(missingScores(game)).toBe(12);
    fill(game.players[0], "40");
    game.players[1].scores.birds = "30";
    expect(missingScores(game)).toBe(5);
    const saved = toSavedGame(game);
    expect(saved).toMatchObject({ decision: "unfinished", winners: [], summary: "Unfinished game" });
    fill(game.players[1], "30");
    expect(missingScores(game)).toBe(0);
    expect(toSavedGame(game).winners).toEqual([0]);
  });

  it("doesn't wait on nectar rows or unused columns", () => {
    const game = newGame({ ...DEFAULT_CONFIG, oceania: true }, ["Jordan", "", ""]);
    fill(game.players[0], "40");
    expect(missingScores(game)).toBe(0);
  });

  it("snapshots a finished game", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", ""]);
    fill(game.players[0], "94");
    fill(game.players[1], "50");
    const saved = toSavedGame(game, new Date("2026-10-01T20:00:00Z"));
    expect(saved).toMatchObject({
      finishedAt: "2026-10-01T20:00:00.000Z",
      winners: [0],
      decision: "points",
      summary: "Jordan won with 94",
    });
    expect(saved.players[1].name).toBe("Player 2");
  });

  it("ignores scores in rows the current setup hides", () => {
    const game = newGame({ ...DEFAULT_CONFIG, oceania: true }, ["Jordan", ""]);
    game.players[0].scores.birds = "40";
    game.players[1].nectarSpent.forest = "2";
    expect(playerHasData(game.players[1], game.config)).toBe(true);
    const base = { ...game, config: DEFAULT_CONFIG };
    expect(playerHasData(base.players[1], base.config)).toBe(false);
    expect(toSavedGame(base).players.map((p) => p.name)).toEqual(["Jordan"]);
  });

  it("keeps a named player with blank boxes in an unfinished game", () => {
    const game = newGame(DEFAULT_CONFIG, ["Alice", "Bob", ""]);
    fill(game.players[0], "5");
    const saved = toSavedGame(game);
    expect(saved.decision).toBe("unfinished");
    expect(saved.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
    expect(saved.sheet.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("drops unused food left over from an earlier tie", () => {
    const game = newGame(DEFAULT_CONFIG, ["A", "B", "C"]);
    fill(game.players[0], "50");
    fill(game.players[1], "40");
    fill(game.players[2], "40");
    game.players.forEach((p) => (p.unusedFood = "2"));
    expect(toSavedGame(game).players.map((p) => p.unusedFood)).toEqual([null, null, null]);
    game.players[0].scores.birds = "40";
    game.players[0].unusedFood = "3";
    expect(toSavedGame(game).players.map((p) => p.unusedFood)).toEqual([3, 2, 2]);
  });

  it("updates a re-saved game in place, keeping its date", () => {
    const a = toSavedGame(newGame(), new Date("2026-10-01T20:00:00Z"));
    const b = toSavedGame(newGame(), new Date("2026-10-02T20:00:00Z"));
    const history = addToHistory(addToHistory([], a), b);
    const edited = { ...a, summary: "changed", finishedAt: "2026-10-03T09:00:00.000Z" };
    const next = addToHistory(history, edited);
    expect(next.map((g) => g.id)).toEqual([b.id, a.id]);
    expect(next[1]).toMatchObject({ summary: "changed", finishedAt: "2026-10-01T20:00:00.000Z" });
  });

  it("leaves empty columns out of a saved game", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", "Sam", ""]);
    fill(game.players[0], "40");
    fill(game.players[1], "30");
    const saved = toSavedGame(game);
    expect(saved.players.map((p) => p.name)).toEqual(["Jordan", "Sam"]);
    expect(saved.winners).toEqual([0]);
  });

  it("adds newest first, deletes by id, and caps the list", () => {
    const a = toSavedGame(newGame());
    const b = toSavedGame(newGame());
    const history = addToHistory(addToHistory([], a), b);
    expect(history.map((g) => g.id)).toEqual([b.id, a.id]);
    expect(removeFromHistory(history, b.id)).toEqual([a]);

    let big: typeof history = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) big = addToHistory(big, { ...a, id: String(i) });
    expect(big).toHaveLength(MAX_HISTORY);
  });

  it("keeps the sheet as typed, so it can be edited later", () => {
    const game = newGame({ ...newGame().config, oceania: true });
    game.players[0].nectarSpent.forest = "2";
    game.players[0].scores.birds = "5";
    const saved = toSavedGame(game, new Date(), "game-1");
    expect(saved.id).toBe("game-1");
    expect(saved.sheet).toHaveLength(saved.players.length);
    expect(saved.sheet[0].nectarSpent.forest).toBe("2");
    expect(isHistory([{ ...saved, sheet: [] }])).toBe(false);
  });

  it("rejects malformed stored data", () => {
    expect(isCurrentGame(newGame())).toBe(true);
    expect(isCurrentGame({ config: {}, players: [] })).toBe(false);
    expect(isHistory([toSavedGame(newGame())])).toBe(true);
    expect(isHistory([{ id: 1 }])).toBe(false);
    expect(isHistory("nope")).toBe(false);

    const good = toSavedGame(newGame());
    expect(isHistory([{ ...good, players: [{ name: { x: 1 }, total: 1, breakdown: {}, unusedFood: null }] }])).toBe(
      false,
    );
    expect(isHistory([{ ...good, winners: [9] }])).toBe(false);
    expect(isHistory([{ ...good, decision: "maybe" }])).toBe(false);

    const sheet = newGame();
    expect(isCurrentGame({ ...sheet, players: [{ ...sheet.players[0], scores: { birds: { x: 1 } } }, sheet.players[1]] })).toBe(
      false,
    );
    expect(isCurrentGame({ ...sheet, players: [] })).toBe(false);
  });
});

describe("storage wrapper", () => {
  let localStorage: Storage;
  beforeEach(() => {
    const data = new Map<string, string>();
    localStorage = {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: k => data.get(k) ?? null,
      key: i => [...data.keys()][i] ?? null,
      removeItem: k => void data.delete(k),
      setItem: (k, v) => void data.set(k, String(v)),
    };
  });

  it("round-trips JSON through localStorage", () => {
    const store = createStore(localStorage);
    expect(store.persistent).toBe(true);
    store.write("k", { a: 1 });
    expect(store.read("k", null)).toEqual({ a: 1 });
  });

  it("sees what another tab wrote", () => {
    const store = createStore(localStorage);
    store.write("k", [1]);
    localStorage.setItem("k", JSON.stringify([2, 1]));
    expect(store.read("k", null)).toEqual([2, 1]);
  });

  it("falls back to memory when storage is unavailable", () => {
    const store = createStore(null);
    expect(store.persistent).toBe(false);
    expect(store.write("k", [1])).toBe(false);
    expect(store.read("k", [])).toEqual([1]);
  });

  it("survives a storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    const store = createStore(broken);
    expect(store.write("k", 1)).toBe(false);
    expect(store.read("k", 0)).toBe(1);
    expect(store.persistent).toBe(false);
    expect(() => store.remove("k")).not.toThrow();
  });

  it("never reads back an older value after a failed write", () => {
    localStorage.setItem("k", "1");
    let full = false;
    const flaky = {
      getItem: (k: string) => localStorage.getItem(k),
      setItem: (k: string, v: string) => {
        if (full) throw new Error("quota");
        localStorage.setItem(k, v);
      },
      removeItem: (k: string) => localStorage.removeItem(k),
    } as unknown as Storage;
    const store = createStore(flaky);
    full = true;
    expect(store.write("k", 2)).toBe(false);
    expect(store.read("k", 0)).toBe(2);
    expect(store.persistent).toBe(false);
  });

  it("returns the fallback for corrupt or invalid values", () => {
    localStorage.setItem("bad", "{not json");
    localStorage.setItem("wrong", JSON.stringify({ x: 1 }));
    const store = createStore(localStorage);
    expect(store.read("bad", "fallback")).toBe("fallback");
    expect(store.read("wrong", [], isHistory)).toEqual([]);
  });
});

describe("grid navigation", () => {
  it("moves and stops at edges", () => {
    expect(nextCell({ row: 0, col: 0 }, "down", 3, 2)).toEqual({ row: 1, col: 0 });
    expect(nextCell({ row: 0, col: 0 }, "up", 3, 2)).toBeNull();
    expect(nextCell({ row: 0, col: 1 }, "right", 3, 2)).toBeNull();
    expect(nextCell({ row: 2, col: 1 }, "left", 3, 2)).toEqual({ row: 2, col: 0 });
  });

  it("Enter wraps from the bottom of a column to the top of the next", () => {
    expect(nextCell({ row: 2, col: 0 }, "down-wrap", 3, 2)).toEqual({ row: 0, col: 1 });
    expect(nextCell({ row: 2, col: 1 }, "down-wrap", 3, 2)).toBeNull();
    expect(nextCell({ row: 0, col: 1 }, "up-wrap", 3, 2)).toEqual({ row: 2, col: 0 });
  });

  it("wraps to a chosen first row, skipping a header row", () => {
    expect(nextCell({ row: 2, col: 0 }, "down-wrap", 3, 2, undefined, 1)).toEqual({ row: 1, col: 1 });
    expect(nextCell({ row: 1, col: 1 }, "up-wrap", 3, 2, undefined, 1)).toEqual({ row: 2, col: 0 });
    // Plain up from a score row still reaches the name row.
    expect(nextCell({ row: 1, col: 1 }, "up", 3, 2, undefined, 1)).toEqual({ row: 0, col: 1 });
  });

  it("skips disabled cells", () => {
    const enabled = ({ row }: { row: number }) => row !== 1;
    expect(nextCell({ row: 0, col: 0 }, "down", 3, 1, enabled)).toEqual({ row: 2, col: 0 });
    expect(nextCell({ row: 0, col: 0 }, "down", 2, 1, enabled)).toBeNull();
  });
});
