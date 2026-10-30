import {
  categoriesFor,
  HABITATS,
  usesFriendlyNectarTies,
  type CategoryId,
  type GameConfig,
  type Habitat,
} from "./rules";

/** A player's column on the sheet. Values are the raw strings from the inputs. */
export interface PlayerSheet {
  id: string;
  name: string;
  /** Short header code, fixed once the name is entered (see lib/names). */
  code?: string;
  scores: Partial<Record<CategoryId, string>>;
  /** Oceania: nectar tokens on each habitat's "spent nectar" space. */
  nectarSpent: Partial<Record<Habitat, string>>;
  /** Tie-breaker only: food tokens left in the player's supply. Never scored. */
  unusedFood: string;
}

export const MAX_INPUT_LENGTH = 3;

/** Accepts "" or up to three digits, with a leading minus where allowed. Used to filter keystrokes. */
export function isValidScoreInput(value: string, allowNegative = false): boolean {
  const sign = allowNegative ? "-?" : "";
  return value === "" || (allowNegative && value === "-") || new RegExp(`^${sign}\\d{1,${MAX_INPUT_LENGTH}}$`).test(value);
}

/** Empty or malformed input counts as 0, and so do negatives unless allowed. */
export function parseScore(value: string | undefined, allowNegative = false): number {
  if (!value) return 0;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 0;
  return allowNegative || n > 0 ? n : 0;
}

const MAJORITY_POINTS = [5, 2] as const;

/**
 * Oceania nectar majority for one habitat.
 *
 * Standard rule (Oceania rulebook p. 3): most nectar scores 5, second most 2.
 * You need at least 1 nectar to qualify. Tied players add up the points for
 * the places they occupy and split them evenly, rounded down, and the next
 * place is not awarded (two tied for first get floor((5+2)/2) = 3 each, and
 * nobody scores second).
 *
 * Friendly ties (Asia Flock mode, rulebook p. 11): every player tied for a
 * place gets that place's full points, and the next-highest amount still
 * takes second place.
 */
export function scoreNectarHabitat(spent: number[], friendlyTies = false): number[] {
  const points = spent.map(() => 0);
  const distinct = [...new Set(spent.filter((n) => n > 0))].sort((a, b) => b - a);

  let place = 0; // index into MAJORITY_POINTS for the current tie group
  for (let rank = 0; rank < distinct.length && place < MAJORITY_POINTS.length; rank++) {
    const tied = spent.flatMap((n, i) => (n === distinct[rank] ? [i] : []));
    let award: number;
    if (friendlyTies) {
      award = MAJORITY_POINTS[place];
      place += 1;
    } else {
      const pool = MAJORITY_POINTS.slice(place, place + tied.length).reduce((a, b) => a + b, 0);
      award = Math.floor(pool / tied.length);
      place += tied.length;
    }
    for (const i of tied) points[i] = award;
  }
  return points;
}

/** Total nectar points per player across all three habitats. */
export function scoreNectar(players: PlayerSheet[], friendlyTies = false): number[] {
  const totals = players.map(() => 0);
  for (const habitat of HABITATS) {
    const spent = players.map((p) => parseScore(p.nectarSpent[habitat]));
    scoreNectarHabitat(spent, friendlyTies).forEach((pts, i) => {
      totals[i] += pts;
    });
  }
  return totals;
}

/**
 * Anything typed for this player in the rows `config` shows. Scores kept from
 * an expansion that has since been switched off don't count until it's back on.
 * Unused food is left out: it only matters between players who already scored.
 * A lone "-" is a sign chosen before any digits, not a score.
 */
export function playerHasData(p: PlayerSheet, config: GameConfig): boolean {
  return (
    categoriesFor(config).some((c) => c.id !== "nectar" && /\d/.test(p.scores[c.id] ?? "")) ||
    (config.oceania && Object.values(p.nectarSpent).some(Boolean))
  );
}

/** Players taking part: anyone with a name or a score. Blank columns aren't. */
export function inGame(p: PlayerSheet, config: GameConfig): boolean {
  return !!p.name.trim() || playerHasData(p, config);
}

export type Breakdown = Partial<Record<CategoryId, number>>;

/** Per-category points for every player. Nectar is computed, everything else is typed in. */
export function scoreBreakdowns(config: GameConfig, players: PlayerSheet[]): Breakdown[] {
  const categories = categoriesFor(config);
  const nectar = config.oceania ? scoreNectar(players, usesFriendlyNectarTies(config)) : null;
  return players.map((player, i) => {
    const row: Breakdown = {};
    for (const { id, allowsNegative } of categories) {
      row[id] = id === "nectar" ? (nectar?.[i] ?? 0) : parseScore(player.scores[id], allowsNegative);
    }
    return row;
  });
}

export function sumBreakdown(breakdown: Breakdown): number {
  return Object.values(breakdown).reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

export type Decision =
  /** Nothing scored yet. */
  | "none"
  /** One player, nobody to beat. */
  | "solo"
  /** Outright most points. */
  | "points"
  /** Tied on points, broken by unused food tokens. */
  | "food"
  /** Still tied after food: tied players share the victory. */
  | "shared"
  /** Tied on points, waiting for unused food counts. */
  | "needs-food"
  /** Saved before every score box was filled in: no winner. */
  | "unfinished";

export interface Outcome {
  totals: number[];
  /** Players tied for the most points. */
  leaders: number[];
  /** Winning player indexes (more than one means a shared victory or a pending tie-break). */
  winners: number[];
  decision: Decision;
}

/**
 * Official rule (base rulebook p. 5): "The player who has the most points
 * wins. In the case of a tie, the player with the most unused food tokens
 * wins. If players are still tied, they share the victory."
 */
export function decideOutcome(
  totals: number[],
  unusedFood: string[],
  /** Whether anything was typed in. Everyone on 0 is still a tie once scored. */
  scored = totals.some((t) => t !== 0),
): Outcome {
  if (totals.length === 0 || !scored) {
    return { totals, leaders: [], winners: [], decision: "none" };
  }
  const best = Math.max(...totals);
  const leaders = totals.flatMap((t, i) => (t === best ? [i] : []));

  if (totals.length === 1) return { totals, leaders, winners: leaders, decision: "solo" };
  if (leaders.length === 1) return { totals, leaders, winners: leaders, decision: "points" };

  if (leaders.some((i) => (unusedFood[i] ?? "") === "")) {
    return { totals, leaders, winners: leaders, decision: "needs-food" };
  }
  const food = leaders.map((i) => parseScore(unusedFood[i]));
  const mostFood = Math.max(...food);
  const winners = leaders.filter((_, k) => food[k] === mostFood);
  return { totals, leaders, winners, decision: winners.length === 1 ? "food" : "shared" };
}

export function scoreGame(config: GameConfig, players: PlayerSheet[]) {
  const breakdowns = scoreBreakdowns(config, players);
  const totals = breakdowns.map(sumBreakdown);
  // Only players in the game can win: a blank column's 0 can't beat a
  // negative total or tie a real 0. Indexes stay the sheet's columns.
  const taking = players.flatMap((p, i) => (inGame(p, config) ? [i] : []));
  const among = decideOutcome(
    taking.map((i) => totals[i]),
    taking.map((i) => players[i].unusedFood),
    players.some((p) => playerHasData(p, config)),
  );
  const outcome: Outcome = {
    ...among,
    totals,
    leaders: among.leaders.map((k) => taking[k]),
    winners: among.winners.map((k) => taking[k]),
  };
  return { breakdowns, totals, outcome };
}

export function displayName(player: Pick<PlayerSheet, "name">, index: number): string {
  return player.name.trim() || `Player ${index + 1}`;
}

/** Joins names as "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Second line explaining a tie, e.g. "Tied with Sam at 87, won on unused food 3 to 1".
 * Null when there was no tie at the top.
 */
export function describeTiebreak(outcome: Outcome, names: string[], unusedFood: string[]): string | null {
  const { decision, leaders, winners, totals } = outcome;
  const score = totals[leaders[0]];
  if (decision === "food") {
    const others = leaders.filter((i) => !winners.includes(i));
    const theirs = Math.max(...others.map((i) => parseScore(unusedFood[i])));
    return `Tied with ${joinNames(others.map((i) => names[i]))} at ${score}, won on unused food ${parseScore(
      unusedFood[winners[0]],
    )} to ${theirs}`;
  }
  if (decision === "shared") {
    return `Tied on points and on unused food (${parseScore(unusedFood[winners[0]])} each)`;
  }
  return null;
}

/** One-line result, e.g. "Jordan won with 94". */
export function summarize(outcome: Outcome, names: string[]): string {
  const { decision, winners, totals } = outcome;
  const who = joinNames(winners.map((i) => names[i]));
  const score = winners.length ? totals[winners[0]] : 0;
  switch (decision) {
    case "none":
      return "No scores yet";
    case "solo":
      return `${who} scored ${score}`;
    case "points":
      return `${who} won with ${score}`;
    case "food":
      return `${who} won with ${score}`;
    case "shared":
      return `${who} shared the win with ${score}`;
    case "needs-food":
      return `${who} tied with ${score}`;
    case "unfinished":
      return "Unfinished game";
  }
}
