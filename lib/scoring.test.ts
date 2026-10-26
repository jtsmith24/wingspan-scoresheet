import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, type GameConfig } from "./rules";
import {
  decideOutcome,
  describeTiebreak,
  isValidScoreInput,
  joinNames,
  parseScore,
  scoreGame,
  scoreNectar,
  scoreNectarHabitat,
  summarize,
  type PlayerSheet,
} from "./scoring";

function player(name: string, scores: PlayerSheet["scores"] = {}, extra: Partial<PlayerSheet> = {}): PlayerSheet {
  return { id: name, name, scores, nectarSpent: {}, unusedFood: "", ...extra };
}

describe("input parsing", () => {
  it("accepts empty or up to three digits", () => {
    expect(isValidScoreInput("")).toBe(true);
    expect(isValidScoreInput("0")).toBe(true);
    expect(isValidScoreInput("123")).toBe(true);
    expect(isValidScoreInput("1234")).toBe(false);
    expect(isValidScoreInput("-1")).toBe(false);
    expect(isValidScoreInput("1.5")).toBe(false);
    expect(isValidScoreInput("a")).toBe(false);
  });

  it("treats blank values as zero", () => {
    expect(parseScore("")).toBe(0);
    expect(parseScore(undefined)).toBe(0);
    expect(parseScore("042")).toBe(42);
  });
});

describe("base game totals", () => {
  it("sums every category for each player", () => {
    const { totals, breakdowns } = scoreGame(DEFAULT_CONFIG, [
      player("Jordan", { birds: "40", bonus: "10", goals: "15", eggs: "12", food: "5", tucked: "12" }),
      player("Sam", { birds: "35", eggs: "20" }),
    ]);
    expect(totals).toEqual([94, 55]);
    expect(breakdowns[1]).toEqual({ birds: 35, bonus: 0, goals: 0, eggs: 20, food: 0, tucked: 0 });
  });

  it("ignores rows that are not on the current sheet", () => {
    const { totals } = scoreGame(DEFAULT_CONFIG, [player("A", { birds: "10", duet: "9", nectar: "5" })]);
    expect(totals).toEqual([10]);
  });

  it("adds duet tokens only in Asia duet mode", () => {
    const duet: GameConfig = { ...DEFAULT_CONFIG, asia: "duet" };
    const { totals } = scoreGame(duet, [player("A", { birds: "10", duet: "7" }), player("B")]);
    expect(totals[0]).toBe(17);
  });
});

describe("Oceania nectar majority (standard ties)", () => {
  it("gives 5 to the most and 2 to the second most", () => {
    expect(scoreNectarHabitat([4, 2, 1])).toEqual([5, 2, 0]);
  });

  it("requires at least one nectar to qualify", () => {
    expect(scoreNectarHabitat([3, 0, 0])).toEqual([5, 0, 0]);
    expect(scoreNectarHabitat([0, 0])).toEqual([0, 0]);
  });

  it("splits a tie for first: (5 + 2) / 2 rounded down, and no second place", () => {
    expect(scoreNectarHabitat([3, 3, 1])).toEqual([3, 3, 0]);
  });

  it("splits a tie for second: 2 / 2", () => {
    expect(scoreNectarHabitat([5, 2, 2])).toEqual([5, 1, 1]);
  });

  it("splits a three-way tie for first: 7 / 3 rounded down", () => {
    expect(scoreNectarHabitat([2, 2, 2, 1])).toEqual([2, 2, 2, 0]);
  });

  it("totals all three habitats", () => {
    const players = [
      player("A", {}, { nectarSpent: { forest: "2", grassland: "1", wetland: "" } }),
      player("B", {}, { nectarSpent: { forest: "1", grassland: "1", wetland: "3" } }),
    ];
    // forest: A 5, B 2; grassland: tie -> 3 each; wetland: B 5
    expect(scoreNectar(players)).toEqual([8, 10]);
  });

  it("feeds the computed nectar into the total", () => {
    const oceania: GameConfig = { ...DEFAULT_CONFIG, oceania: true };
    const { totals, breakdowns } = scoreGame(oceania, [
      player("A", { birds: "10", nectar: "99" }, { nectarSpent: { forest: "1" } }),
      player("B"),
    ]);
    expect(breakdowns[0].nectar).toBe(5);
    expect(totals[0]).toBe(15);
  });
});

describe("Asia Flock mode nectar (friendly ties)", () => {
  it("gives every tied player full first-place points and still awards second", () => {
    expect(scoreNectarHabitat([3, 3, 1, 0, 0, 0], true)).toEqual([5, 5, 2, 0, 0, 0]);
  });

  it("gives every player tied for second the full 2", () => {
    expect(scoreNectarHabitat([4, 2, 2, 1, 0, 0], true)).toEqual([5, 2, 2, 0, 0, 0]);
  });

  it("is used automatically in flock mode", () => {
    const flock: GameConfig = { ...DEFAULT_CONFIG, oceania: true, asia: "flock" };
    const players = ["A", "B", "C", "D", "E", "F"].map((n, i) =>
      player(n, {}, { nectarSpent: { forest: i < 2 ? "2" : i === 2 ? "1" : "" } }),
    );
    expect(scoreGame(flock, players).breakdowns.map((b) => b.nectar)).toEqual([5, 5, 2, 0, 0, 0]);
  });
});

describe("winner and tie-break", () => {
  it("reports no winner before anything is scored", () => {
    expect(decideOutcome([0, 0], ["", ""]).decision).toBe("none");
  });

  it("treats everyone scoring 0 as a tie once something is typed in", () => {
    expect(decideOutcome([0, 0], ["", ""], true)).toMatchObject({ leaders: [0, 1], decision: "needs-food" });
  });

  it("picks the outright highest score", () => {
    expect(decideOutcome([80, 94, 70], ["", "", ""])).toMatchObject({ winners: [1], decision: "points" });
  });

  it("waits for unused food when players tie on points", () => {
    expect(decideOutcome([87, 87, 60], ["3", "", ""])).toMatchObject({
      leaders: [0, 1],
      winners: [0, 1],
      decision: "needs-food",
    });
  });

  it("only needs food counts from the tied players", () => {
    expect(decideOutcome([87, 87, 60], ["3", "1", ""])).toMatchObject({ winners: [0], decision: "food" });
  });

  it("breaks a tie with the most unused food tokens", () => {
    expect(decideOutcome([87, 87], ["1", "4"])).toMatchObject({ winners: [1], decision: "food" });
  });

  it("treats zero food as a real answer", () => {
    expect(decideOutcome([87, 87], ["0", "2"])).toMatchObject({ winners: [1], decision: "food" });
  });

  it("shares the victory when food is also tied", () => {
    expect(decideOutcome([87, 87, 87], ["2", "2", "1"])).toMatchObject({ winners: [0, 1], decision: "shared" });
  });

  it("handles a solo game", () => {
    expect(decideOutcome([71], [""]).decision).toBe("solo");
  });
});

describe("summaries", () => {
  const names = ["Jordan", "Sam", "Alex"];

  it("reads naturally", () => {
    expect(summarize(decideOutcome([94, 80, 70], ["", "", ""]), names)).toBe("Jordan won with 94");
    expect(summarize(decideOutcome([87, 87, 1], ["3", "1", ""]), names)).toBe("Jordan won with 87");
    expect(summarize(decideOutcome([87, 87, 87], ["1", "1", "1"]), names)).toBe(
      "Jordan, Sam and Alex shared the win with 87",
    );
  });

  it("explains how a tie was settled", () => {
    const food = ["3", "1", ""];
    expect(describeTiebreak(decideOutcome([87, 87, 1], food), names, food)).toBe(
      "Tied with Sam at 87, won on unused food 3 to 1",
    );
    const same = ["2", "2", "2"];
    expect(describeTiebreak(decideOutcome([87, 87, 87], same), names, same)).toBe(
      "Tied on points and on unused food (2 each)",
    );
    expect(describeTiebreak(decideOutcome([90, 87, 1], food), names, food)).toBeNull();
  });

  it("joins names", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
  });
});

describe("hummingbirds", () => {
  const americas: GameConfig = { ...DEFAULT_CONFIG, americas: true };

  it("accepts negative input only where allowed", () => {
    expect(isValidScoreInput("-3", true)).toBe(true);
    expect(isValidScoreInput("-", true)).toBe(true);
    expect(isValidScoreInput("-3")).toBe(false);
    expect(isValidScoreInput("12a", true)).toBe(false);
    expect(parseScore("-3", true)).toBe(-3);
    expect(parseScore("-", true)).toBe(0);
  });

  it("counts negative hummingbird points in the total", () => {
    const { totals } = scoreGame(americas, [
      player("A", { birds: "20", hummingbirds: "-4" }),
      player("B", { birds: "10", hummingbirds: "7" }),
    ]);
    expect(totals).toEqual([16, 17]);
  });

  it("ignores hummingbird scores when the Americas is off", () => {
    const { totals } = scoreGame(DEFAULT_CONFIG, [
      player("A", { birds: "20", hummingbirds: "-4" }),
    ]);
    expect(totals).toEqual([20]);
  });
});
