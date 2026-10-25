import { withCodes } from "./names";
import {
  categoriesFor,
  DEFAULT_CONFIG,
  playerLimits,
  type GameConfig,
} from "./rules";
import {
  describeTiebreak,
  displayName,
  scoreGame,
  summarize,
  type Breakdown,
  type Decision,
  type PlayerSheet,
} from "./scoring";

export interface CurrentGame {
  config: GameConfig;
  players: PlayerSheet[];
  /** History id once this sheet has been saved; saving again updates that entry. */
  savedAs?: string;
  /** True when the sheet has changed since it was last saved. */
  dirty?: boolean;
}

export interface SavedPlayer {
  name: string;
  code?: string;
  breakdown: Breakdown;
  total: number;
  unusedFood: number | null;
}

export interface SavedGame {
  id: string;
  /** ISO timestamp. */
  finishedAt: string;
  config: GameConfig;
  players: SavedPlayer[];
  winners: number[];
  decision: Decision;
  summary: string;
  /** How a tie at the top was settled, if there was one. */
  detail?: string;
}

export const MAX_HISTORY = 200;

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto)
      return crypto.randomUUID();
  } catch {
    // Not a secure context; fall through.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyPlayer(name = "", code?: string): PlayerSheet {
  return {
    id: newId(),
    name,
    code,
    scores: {},
    nectarSpent: {},
    unusedFood: "",
  };
}

/** A fresh sheet that keeps the previous players' names and the chosen expansions. */
export function newGame(
  config: GameConfig = DEFAULT_CONFIG,
  names: string[] = [],
  codes: (string | undefined)[] = []
): CurrentGame {
  const { min, max } = playerLimits(config);
  const count = Math.min(max, Math.max(min, names.length || Math.max(min, 2)));
  return {
    config,
    players: Array.from({ length: count }, (_, i) =>
      emptyPlayer(names[i] ?? "", codes[i])
    ),
  };
}

/** Pads or trims the player list to fit a mode's player count. */
export function fitPlayers(
  players: PlayerSheet[],
  config: GameConfig
): PlayerSheet[] {
  const { min, max } = playerLimits(config);
  const fitted = players.slice(0, max);
  while (fitted.length < min) fitted.push(emptyPlayer());
  return fitted;
}

/**
 * Anything typed for this player in the rows `config` shows. Scores kept from
 * an expansion that has since been switched off don't count until it's back on.
 * Unused food is left out: it only matters between players who already scored.
 */
export function playerHasData(p: PlayerSheet, config: GameConfig): boolean {
  return (
    categoriesFor(config).some(c => c.id !== "nectar" && !!p.scores[c.id]) ||
    (config.oceania && Object.values(p.nectarSpent).some(Boolean))
  );
}

/** Players taking part: anyone with a name or a score. */
const inGame = (p: PlayerSheet, config: GameConfig) =>
  !!p.name.trim() || playerHasData(p, config);

/**
 * Score boxes still blank for players in the game; a winner is only called
 * at 0. Nectar rows don't count, since blank there means none was spent.
 */
export function missingScores(game: CurrentGame): number {
  const rows = categoriesFor(game.config).filter(c => c.id !== "nectar");
  return game.players
    .filter(p => inGame(p, game.config))
    .reduce(
      (n, p) =>
        n +
        rows.filter(c => {
          const v = p.scores[c.id]?.trim() ?? "";
          return v === "" || v === "-";
        }).length,
      0
    );
}

export function hasAnyScore(game: CurrentGame): boolean {
  return game.players.some(p => playerHasData(p, game.config));
}

/** Whether starting over would throw away scores that aren't in history. */
export function hasUnsavedScores(game: CurrentGame): boolean {
  return hasAnyScore(game) && (!game.savedAs || game.dirty === true);
}

export function toSavedGame(
  game: CurrentGame,
  finishedAt = new Date()
): SavedGame {
  // Columns nobody wrote in (an extra "Player 4") aren't part of the game.
  const scored = game.players.filter(p => playerHasData(p, game.config));
  const players = scored.length ? scored : game.players;
  const { breakdowns, totals, outcome } = scoreGame(game.config, players);
  const names = players.map(displayName);
  const codes = withCodes(players);
  // Saved part-way through: keep the scores but call no winner.
  const unfinished = missingScores(game) > 0;
  return {
    id: game.savedAs ?? newId(),
    finishedAt: finishedAt.toISOString(),
    config: game.config,
    players: players.map((p, i) => ({
      name: names[i],
      code: codes[i] || undefined,
      breakdown: breakdowns[i],
      total: totals[i],
      // Food typed during an earlier tie is stale for anyone not tied now.
      unusedFood:
        p.unusedFood === "" ||
        unfinished ||
        !outcome.leaders.includes(i) ||
        outcome.leaders.length < 2
          ? null
          : Number.parseInt(p.unusedFood, 10),
    })),
    winners: unfinished ? [] : outcome.winners,
    decision: unfinished ? "unfinished" : outcome.decision,
    summary: unfinished ? "Unfinished game" : summarize(outcome, names),
    detail: unfinished
      ? undefined
      : describeTiebreak(
        outcome,
        names,
        players.map(p => p.unusedFood)
      ) ?? undefined,
  };
}

/**
 * Newest first, capped so storage can't grow forever. Re-saving a game
 * updates its entry in place and keeps the day it was first saved.
 */
export function addToHistory(
  history: SavedGame[],
  game: SavedGame
): SavedGame[] {
  const at = history.findIndex(g => g.id === game.id);
  if (at === -1) return [game, ...history].slice(0, MAX_HISTORY);
  const next = [...history];
  next[at] = { ...game, finishedAt: history[at].finishedAt };
  return next;
}

export function removeFromHistory(
  history: SavedGame[],
  id: string
): SavedGame[] {
  return history.filter(g => g.id !== id);
}

// --- Runtime validation for data read back from storage ---------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isConfig(v: unknown): v is GameConfig {
  return (
    isObject(v) &&
    typeof v.european === "boolean" &&
    typeof v.oceania === "boolean" &&
    ["off", "standard", "duet", "flock"].includes(v.asia as string) &&
    typeof v.americas === "boolean"
  );
}

const isRecordOf = (v: unknown, check: (x: unknown) => boolean) =>
  isObject(v) && Object.values(v).every(check);
const isString = (x: unknown) => typeof x === "string";
const isCount = (x: unknown) =>
  typeof x === "number" && Number.isInteger(x) && x >= 0;
// Hummingbird points can be negative, so totals can be too.
const isPoints = (x: unknown) => typeof x === "number" && Number.isInteger(x);
const DECISIONS: readonly Decision[] = [
  "none",
  "solo",
  "points",
  "food",
  "shared",
  "needs-food",
  "unfinished",
];

function isPlayerSheet(v: unknown): v is PlayerSheet {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    (v.code === undefined || typeof v.code === "string") &&
    isRecordOf(v.scores, isString) &&
    isRecordOf(v.nectarSpent, isString) &&
    typeof v.unusedFood === "string"
  );
}

function fitsMode(players: unknown[], config: GameConfig): boolean {
  const { min, max } = playerLimits(config);
  return players.length >= min && players.length <= max;
}

export function isCurrentGame(v: unknown): v is CurrentGame {
  return (
    isObject(v) &&
    isConfig(v.config) &&
    Array.isArray(v.players) &&
    fitsMode(v.players, v.config) &&
    v.players.every(isPlayerSheet) &&
    (v.savedAs === undefined || typeof v.savedAs === "string") &&
    (v.dirty === undefined || typeof v.dirty === "boolean")
  );
}

function isSavedPlayer(v: unknown): v is SavedPlayer {
  return (
    isObject(v) &&
    typeof v.name === "string" &&
    (v.code === undefined || typeof v.code === "string") &&
    isPoints(v.total) &&
    isRecordOf(v.breakdown, isPoints) &&
    (v.unusedFood === null || isCount(v.unusedFood))
  );
}

function isSavedGame(v: unknown): v is SavedGame {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.finishedAt === "string" &&
    !Number.isNaN(Date.parse(v.finishedAt)) &&
    typeof v.summary === "string" &&
    (v.detail === undefined || typeof v.detail === "string") &&
    DECISIONS.includes(v.decision as Decision) &&
    isConfig(v.config) &&
    Array.isArray(v.players) &&
    v.players.every(isSavedPlayer) &&
    Array.isArray(v.winners) &&
    v.winners.every(
      i => isCount(i) && (i as number) < (v.players as unknown[]).length
    )
  );
}

export function isHistory(v: unknown): v is SavedGame[] {
  return Array.isArray(v) && v.every(isSavedGame);
}
