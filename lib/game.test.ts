import { beforeEach, describe, expect, it } from "vitest";
import {
  addToHistory,
  fitPlayers,
  hasUnsavedScores,
  isCurrentGame,
  isHistory,
  MAX_HISTORY,
  newGame,
  rememberNames,
  removeFromHistory,
  toSavedGame,
} from "./game";
import { categoriesFor, DEFAULT_CONFIG, playerLimits } from "./rules";
import { createStore } from "./storage";
import { nextCell } from "./gridNavigation";

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

  it("snapshots a finished game", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", ""]);
    game.players[0].scores.birds = "94";
    game.players[1].scores.birds = "50";
    const saved = toSavedGame(game, new Date("2026-10-01T20:00:00Z"));
    expect(saved).toMatchObject({
      finishedAt: "2026-10-01T20:00:00.000Z",
      winners: [0],
      decision: "points",
      summary: "Jordan won with 94",
    });
    expect(saved.players[1].name).toBe("Player 2");
  });

  it("leaves empty columns out of a saved game", () => {
    const game = newGame(DEFAULT_CONFIG, ["Jordan", "Sam", ""]);
    game.players[0].scores.birds = "40";
    game.players[1].scores.birds = "30";
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

  it("knows when scores would be lost", () => {
    const game = newGame();
    expect(hasUnsavedScores(game)).toBe(false);
    game.players[0].scores.birds = "5";
    expect(hasUnsavedScores(game)).toBe(true);
    expect(hasUnsavedScores({ ...game, savedAs: "x", dirty: false })).toBe(false);
    expect(hasUnsavedScores({ ...game, savedAs: "x", dirty: true })).toBe(true);
  });

  it("remembers distinct names, most recent first", () => {
    expect(rememberNames(["Sam", "Jordan"], ["jordan", " Alex ", ""])).toEqual(["jordan", "Alex", "Sam"]);
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
