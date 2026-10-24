import { DEFAULT_CONFIG, playerLimits, type GameConfig } from "./rules";
import { describeTiebreak, displayName, scoreGame, summarize, type Breakdown, type Decision, type PlayerSheet } from "./scoring";

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
export const MAX_REMEMBERED_NAMES = 20;

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // Not a secure context; fall through.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyPlayer(name = ""): PlayerSheet {
  return { id: newId(), name, scores: {}, nectarSpent: {}, unusedFood: "" };
}

/** A fresh sheet that keeps the previous players' names and the chosen expansions. */
export function newGame(config: GameConfig = DEFAULT_CONFIG, names: string[] = []): CurrentGame {
  const { min, max } = playerLimits(config);
  const count = Math.min(max, Math.max(min, names.length || Math.max(min, 2)));
  return {
    config,
    players: Array.from({ length: count }, (_, i) => emptyPlayer(names[i] ?? "")),
  };
}

/** Pads or trims the player list to fit a mode's player count. */
export function fitPlayers(players: PlayerSheet[], config: GameConfig): PlayerSheet[] {
  const { min, max } = playerLimits(config);
  const fitted = players.slice(0, max);
  while (fitted.length < min) fitted.push(emptyPlayer());
  return fitted;
}

/** Anything typed for this player that would be lost if their column went away. */
export function playerHasData(p: PlayerSheet): boolean {
  return (
    Object.values(p.scores).some(Boolean) || Object.values(p.nectarSpent).some(Boolean) || p.unusedFood !== ""
  );
}

export function hasAnyScore(game: CurrentGame): boolean {
  return game.players.some(playerHasData);
}

/** Whether starting over would throw away scores that aren't in history. */
export function hasUnsavedScores(game: CurrentGame): boolean {
  return hasAnyScore(game) && (!game.savedAs || game.dirty === true);
}

export function toSavedGame(game: CurrentGame, finishedAt = new Date()): SavedGame {
  const { breakdowns, totals, outcome } = scoreGame(game.config, game.players);
  const names = game.players.map(displayName);
  return {
    id: game.savedAs ?? newId(),
    finishedAt: finishedAt.toISOString(),
    config: game.config,
    players: game.players.map((p, i) => ({
      name: names[i],
      breakdown: breakdowns[i],
      total: totals[i],
      unusedFood: p.unusedFood === "" ? null : Number.parseInt(p.unusedFood, 10),
    })),
    winners: outcome.winners,
    decision: outcome.decision,
    summary: summarize(outcome, names),
    detail:
      describeTiebreak(
        outcome,
        names,
        game.players.map((p) => p.unusedFood),
      ) ?? undefined,
  };
}

/** Newest first, capped so storage can't grow forever. Re-saving a game replaces its entry. */
export function addToHistory(history: SavedGame[], game: SavedGame): SavedGame[] {
  return [game, ...history.filter((g) => g.id !== game.id)].slice(0, MAX_HISTORY);
}

export function removeFromHistory(history: SavedGame[], id: string): SavedGame[] {
  return history.filter((g) => g.id !== id);
}

/** Most-recent-first list of distinct names (case-insensitive). */
export function rememberNames(previous: string[], used: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...used, ...previous]) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, MAX_REMEMBERED_NAMES);
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

const isRecordOf = (v: unknown, check: (x: unknown) => boolean) => isObject(v) && Object.values(v).every(check);
const isString = (x: unknown) => typeof x === "string";
const isCount = (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 0;
// Hummingbird points can be negative, so totals can be too.
const isPoints = (x: unknown) => typeof x === "number" && Number.isInteger(x);
const DECISIONS: readonly Decision[] = ["none", "solo", "points", "food", "shared", "needs-food"];

function isPlayerSheet(v: unknown): v is PlayerSheet {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
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
    v.winners.every((i) => isCount(i) && (i as number) < (v.players as unknown[]).length)
  );
}

export function isHistory(v: unknown): v is SavedGame[] {
  return Array.isArray(v) && v.every(isSavedGame);
}

export function isNameList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((n) => typeof n === "string");
}

