import { describe, expect, it } from "vitest";
import {
  editBase,
  emptyAutoma,
  hasAnyScore,
  isCurrentGame,
  isHistory,
  missingScores,
  newGame,
  toSavedGame,
  type CurrentGame,
} from "./game";
import {
  categoriesFor,
  DEFAULT_CONFIG,
  describeConfig,
  playerLimits,
  type AutomaDifficulty,
  type GameConfig,
} from "./rules";
import { automaTiebreak, scoreGame, type AutomaSheet, type PlayerSheet } from "./scoring";

const vsAutoma = (difficulty: AutomaDifficulty = 4, extra: Partial<GameConfig> = {}): GameConfig => ({
  ...DEFAULT_CONFIG,
  ...extra,
  automa: { difficulty, hoard: false, ...extra.automa },
});

const player = (scores: PlayerSheet["scores"] = {}, extra: Partial<PlayerSheet> = {}): PlayerSheet => ({
  id: "p",
  name: "Jordan",
  scores,
  nectarSpent: {},
  unusedFood: "",
  ...extra,
});

const automa = (scores: AutomaSheet["scores"] = {}, nectarSpent: AutomaSheet["nectarSpent"] = {}): AutomaSheet => ({
  scores,
  nectarSpent,
});

/** A finished base game: the player's six rows, and the Automa's four boxes. */
const finished = (yours: number, theirs: AutomaSheet["scores"], config = vsAutoma()): CurrentGame => ({
  config,
  players: [player({ birds: String(yours), bonus: "0", goals: "0", eggs: "0", food: "0", tucked: "0" })],
  automa: automa({ faceDown: "0", birds: "0", goals: "0", eggs: "0", ...theirs }),
});

describe("the Automa's score", () => {
  it("counts face-down birds at 3, 4 or 5 by difficulty, plus face-up points", () => {
    const sheet = automa({ faceDown: "5", birds: "21", goals: "14", eggs: "11" });
    for (const [difficulty, total] of [
      [3, 61],
      [4, 66],
      [5, 71],
    ] as const) {
      const { totals } = scoreGame(vsAutoma(difficulty), [player()], sheet);
      expect(totals[1]).toBe(total);
    }
  });

  it("scores no bonus cards, food or tucked cards", () => {
    const sheet = automa({ birds: "10", bonus: "9", food: "9", tucked: "9" });
    expect(scoreGame(vsAutoma(), [player()], sheet).totals[1]).toBe(10);
  });

  it("turns cache tokens into eggs at 1 per 5, 4 or 3 with Asia or Americas", () => {
    const asia = { asia: "standard" } as const;
    for (const [difficulty, tokens, eggs] of [
      [3, "14", 2],
      [4, "8", 2],
      [5, "3", 1],
      [4, "0", 0],
      [4, "", 0],
    ] as const) {
      const { breakdowns } = scoreGame(vsAutoma(difficulty, asia), [player()], automa({ tokens }));
      expect(breakdowns[1].cache).toBe(eggs);
    }
    const americas = scoreGame(vsAutoma(4, { americas: true }), [player()], automa({ tokens: "9" }));
    expect(americas.breakdowns[1].cache).toBe(2);
  });

  it("only has tokens with Asia, Americas or the Hoard variant", () => {
    const sheet = automa({ tokens: "8" });
    expect(categoriesFor(vsAutoma()).map((c) => c.id)).not.toContain("cache");
    expect(scoreGame(vsAutoma(), [player()], sheet).totals[1]).toBe(0);
    const hoard = vsAutoma(4, { automa: { difficulty: 4, hoard: true } });
    expect(scoreGame(hoard, [player()], sheet).totals[1]).toBe(2);
    // Never a cache row without the Automa.
    expect(categoriesFor({ ...DEFAULT_CONFIG, asia: "standard" }).map((c) => c.id)).not.toContain("cache");
  });

  it("doesn't count cache eggs in the player's score", () => {
    const config = vsAutoma(4, { asia: "standard" });
    const { totals } = scoreGame(config, [player({ birds: "5", cache: "9" })], automa());
    expect(totals[0]).toBe(5);
  });

  it("competes for nectar in each habitat", () => {
    const config = vsAutoma(4, { oceania: true });
    const you = player({}, { nectarSpent: { forest: "3", wetland: "1" } });
    const them = automa({}, { forest: "3", grassland: "2", wetland: "2" });
    const { breakdowns } = scoreGame(config, [you], them);
    // Forest tied: (5+2)/2 = 3 each. Grassland: the Automa alone. Wetland: the Automa 5, you 2.
    expect(breakdowns[0].nectar).toBe(3 + 0 + 2);
    expect(breakdowns[1].nectar).toBe(3 + 5 + 5);
  });

  it("scores Duet tokens and the hummingbird track, which can be negative", () => {
    const config = vsAutoma(4, { asia: "duet", americas: true });
    const { totals } = scoreGame(config, [player()], automa({ duet: "6", hummingbirds: "-3" }));
    expect(totals[1]).toBe(3);
  });
});

describe("the result against the Automa", () => {
  it("names who was beaten", () => {
    expect(toSavedGame(finished(76, { birds: "66" })).summary).toBe("Jordan beat the Automa, 76 to 66");
    expect(toSavedGame(finished(60, { birds: "80" })).summary).toBe("The Automa won with 80");
  });

  it("breaks a tie on your food against the Automa's 2", () => {
    const game = finished(70, { birds: "70" });
    expect(scoreGame(game.config, game.players, game.automa).outcome.decision).toBe("needs-food");
    game.players[0].unusedFood = "3";
    const saved = toSavedGame(game);
    expect(saved.decision).toBe("food");
    expect(saved.winners).toEqual([0]);
    expect(saved.summary).toBe("Jordan beat the Automa on the tiebreak");
    expect(saved.detail).toBe("Tied at 70; won on the tiebreak, 3 unused food to the Automa's 2 food");
  });

  it("uses the tokens left after making eggs when there are tokens", () => {
    // Eagle: 11 tokens make 2 eggs and leave 3.
    const game = finished(72, { birds: "70", tokens: "11" }, vsAutoma(4, { americas: true }));
    game.players[0].scores.hummingbirds = "0";
    game.automa!.scores.hummingbirds = "0";
    game.players[0].unusedFood = "1";
    const saved = toSavedGame(game);
    expect(saved.automa?.tiebreak).toBe(3);
    expect(saved.winners).toEqual([1]);
    expect(saved.summary).toBe("The Automa won with 72");
    expect(saved.detail).toBe("Tied at 72; the Automa won the tiebreak, 1 unused food to the Automa's 3 tokens");
  });

  it("counts blank tokens as none left, not the base game's 2 food", () => {
    const config = vsAutoma(4, { asia: "standard" });
    expect(automaTiebreak(config, automa())).toBe(0);
    expect(automaTiebreak(vsAutoma(), automa())).toBe(2);
  });

  it("shares the win when the tie-break is level too", () => {
    const game = finished(70, { birds: "70" });
    game.players[0].unusedFood = "2";
    const saved = toSavedGame(game);
    expect(saved.decision).toBe("shared");
    expect(saved.winners).toEqual([0, 1]);
    expect(saved.summary).toBe("Jordan and the Automa shared the win with 70");
  });
});

describe("an Automa game", () => {
  it("is always one player and the Automa", () => {
    expect(playerLimits(vsAutoma())).toEqual({ min: 1, max: 1 });
    expect(playerLimits(vsAutoma(4, { asia: "duet" }))).toEqual({ min: 1, max: 1 });
    const game = newGame(vsAutoma(), ["Jordan", "Sam"]);
    expect(game.players.map((p) => p.name)).toEqual(["Jordan"]);
    expect(game.automa).toEqual(emptyAutoma());
    expect(newGame(DEFAULT_CONFIG).automa).toBeUndefined();
  });

  it("waits on the blank player even when only the Automa is filled in", () => {
    const game = finished(0, { birds: "40" });
    game.players = [player()];
    // Six player rows, nothing on the Automa's side.
    expect(missingScores(game)).toBe(6);
    expect(scoreGame(game.config, game.players, game.automa).outcome.decision).not.toBe("solo");
  });

  it("needs both bird boxes but not tokens or nectar", () => {
    const config = vsAutoma(4, { asia: "standard", oceania: true });
    const game = finished(70, {}, config);
    game.automa!.scores.faceDown = "";
    expect(missingScores(game)).toBe(1);
    game.automa!.scores.faceDown = "0";
    expect(missingScores(game)).toBe(0);
  });

  it("counts Automa-only scores as something on the sheet", () => {
    const game = newGame(vsAutoma());
    expect(hasAnyScore(game)).toBe(false);
    game.automa!.scores.goals = "-";
    expect(hasAnyScore(game)).toBe(false);
    game.automa!.scores.goals = "4";
    expect(hasAnyScore(game)).toBe(true);
  });

  it("keeps an unnamed player in a saved game", () => {
    const game = finished(50, { birds: "40" });
    game.players[0].name = "";
    const saved = toSavedGame(game);
    expect(saved.players).toHaveLength(1);
    expect(saved.summary).toBe("Player 1 beat the Automa, 50 to 40");
  });

  it("survives a reload with the Automa as the winner", () => {
    const saved = toSavedGame(finished(60, { birds: "80" }));
    expect(saved.winners).toEqual([1]);
    expect(isHistory(JSON.parse(JSON.stringify([saved])))).toBe(true);
  });

  it("rejects stored games where the Automa doesn't fit", () => {
    const game = newGame(vsAutoma());
    expect(isCurrentGame(game)).toBe(true);
    expect(isCurrentGame({ ...game, automa: undefined })).toBe(false);
    expect(isCurrentGame({ ...newGame(DEFAULT_CONFIG), automa: emptyAutoma() })).toBe(false);
    expect(isCurrentGame({ ...game, config: vsAutoma(4, { asia: "flock" }) })).toBe(false);
    expect(isCurrentGame({ ...game, config: { ...game.config, automa: { difficulty: 6, hoard: false } } })).toBe(
      false,
    );
    const saved = toSavedGame(finished(60, { birds: "80" }));
    expect(isHistory([{ ...saved, automa: undefined }])).toBe(false);
    expect(isHistory([{ ...saved, winners: [2] }])).toBe(false);
    // Always one player against the Automa, in saved games and Undo too.
    expect(isHistory([{ ...saved, players: [...saved.players, ...saved.players] }])).toBe(false);
    const ended = { id: "x", config: game.config, players: [player(), player()], automa: emptyAutoma() };
    expect(isCurrentGame({ ...game, lastGame: ended })).toBe(false);
    expect(isCurrentGame({ ...game, lastGame: { ...ended, players: [player()] } })).toBe(true);
  });

  it("names the Automa and its difficulty in the setup", () => {
    expect(describeConfig(vsAutoma(5))).toBe("Base game · vs Automa (Eagle-eyed Eagle)");
    expect(describeConfig(vsAutoma(4, { automa: { difficulty: 4, hoard: true } }))).toBe(
      "Base game · vs Automa (Eagle + Hoard)",
    );
  });

  it("notices an edit elsewhere to the Automa's column alone", () => {
    const saved = toSavedGame(finished(60, { birds: "80" }));
    const changed = { ...saved, automa: { ...saved.automa!, sheet: automa({ birds: "81" }) } };
    expect(editBase(changed)).not.toBe(editBase(saved));
  });
});
