import { withCodes } from "./names";
import {
  automaTokensInPlay,
  categoriesFor,
  DEFAULT_CONFIG,
  playerLimits,
  scoredBy,
  type GameConfig,
} from "./rules";
import {
  AUTOMA_NAME,
  automaHasData,
  automaInputs,
  automaTiebreak,
  describeTiebreak,
  displayName,
  inGame,
  playerHasData,
  scoreGame,
  summarize,
  type AutomaSheet,
  type Breakdown,
  type Decision,
  type PlayerSheet,
} from "./scoring";

export interface CurrentGame {
  config: GameConfig;
  players: PlayerSheet[];
  /** The Automa's column: there exactly when `config.automa` is. */
  automa?: AutomaSheet;
  /** The game just ended, exactly as it was, until the new sheet is touched. */
  lastGame?: EndedGame;
}

/** What Undo needs: where the game went, and the sheet to put back. */
export interface EndedGame {
  id: string;
  config: GameConfig;
  players: PlayerSheet[];
  automa?: AutomaSheet;
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
  /** The sheet as it was typed, one per saved player, for editing later. */
  sheet: PlayerSheet[];
  /** Against the Automa: its column. Its index in `winners` is `players.length`. */
  automa?: {
    breakdown: Breakdown;
    total: number;
    /** Its side of the tie-break: tokens left, or 2. */
    tiebreak: number;
    sheet: AutomaSheet;
  };
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

export const emptyAutoma = (): AutomaSheet => ({ scores: {}, nectarSpent: {} });

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
    automa: config.automa ? emptyAutoma() : undefined,
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

export { playerHasData };

const blank = (v: string | undefined) => {
  const t = v?.trim() ?? "";
  return t === "" || t === "-";
};

/** The Automa's column, when this game is against it. */
export const automaOf = (game: Pick<CurrentGame, "config" | "automa">) =>
  game.config.automa ? game.automa : undefined;

/**
 * Score boxes still blank for players in the game; a winner is only called
 * at 0. Nectar rows don't count, since blank there means none was spent, nor
 * do the Automa's cache/hoard tokens. Against the Automa the player always
 * counts, named or not, and so do both of the Automa's bird boxes.
 */
export function missingScores(
  game: Pick<CurrentGame, "config" | "players" | "automa">
): number {
  const automa = automaOf(game);
  const rows = categoriesFor(game.config).filter(
    c => c.id !== "nectar" && scoredBy(c.id, "player")
  );
  const players = automa
    ? game.players
    : game.players.filter(p => inGame(p, game.config));
  const theirs = players.reduce(
    (n, p) => n + rows.filter(c => blank(p.scores[c.id])).length,
    0
  );
  if (!automa) return theirs;
  return (
    theirs +
    automaInputs(game.config).filter(
      k => k !== "tokens" && blank(automa.scores[k])
    ).length
  );
}

export function hasAnyScore(
  game: Pick<CurrentGame, "config" | "players" | "automa">
): boolean {
  const automa = automaOf(game);
  return (
    game.players.some(p => playerHasData(p, game.config)) ||
    (!!automa && automaHasData(automa, game.config))
  );
}

export function toSavedGame(
  game: Pick<CurrentGame, "config" | "players" | "automa">,
  finishedAt = new Date(),
  id = newId()
): SavedGame {
  const automa = automaOf(game);
  // Columns nobody wrote in (an extra "Player 4") aren't part of the game;
  // a named player with blank boxes is, so an unfinished game keeps them.
  // Against the Automa the one player always is.
  const taking = automa
    ? game.players
    : game.players.filter(p => inGame(p, game.config));
  const players = taking.length ? taking : game.players;
  const { breakdowns, totals, outcome } = scoreGame(
    game.config,
    players,
    automa
  );
  const automaCol = automa ? players.length : undefined;
  const names = [...players.map(displayName), AUTOMA_NAME];
  const food = [
    ...players.map(p => p.unusedFood),
    automa ? String(automaTiebreak(game.config, automa)) : "",
  ];
  const codes = withCodes(players);
  // Saved part-way through: keep the scores but call no winner.
  const unfinished = missingScores(game) > 0;
  return {
    id,
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
    summary: unfinished
      ? "Unfinished game"
      : summarize(outcome, names, automaCol),
    detail: unfinished
      ? undefined
      : describeTiebreak(
          outcome,
          names,
          food,
          automaCol,
          automaTokensInPlay(game.config)
        ) ?? undefined,
    sheet: players,
    automa: automa && {
      breakdown: breakdowns[players.length],
      total: totals[players.length],
      tiebreak: automaTiebreak(game.config, automa),
      sheet: automa,
    },
  };
}

/** What an edit of a past game started from, to notice changes made elsewhere. */
export const editBase = (game: SavedGame) =>
  JSON.stringify([game.sheet, game.automa?.sheet]);

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
    typeof v.americas === "boolean" &&
    (v.automa === undefined ||
      (isObject(v.automa) &&
        [3, 4, 5].includes(v.automa.difficulty as number) &&
        typeof v.automa.hoard === "boolean" &&
        // The Automa doesn't play Flock (6-7 players).
        v.asia !== "flock"))
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

function isAutomaSheet(v: unknown): v is AutomaSheet {
  return (
    isObject(v) &&
    isRecordOf(v.scores, isString) &&
    isRecordOf(v.nectarSpent, isString)
  );
}

/** An Automa column exactly when the setup has the Automa. */
const automaMatches = (config: GameConfig, automa: unknown) =>
  config.automa ? isAutomaSheet(automa) : automa === undefined;

/** Against the Automa it's always one player. */
const onePlayerVsAutoma = (config: GameConfig, players: unknown[]) =>
  !config.automa || players.length === 1;

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
    automaMatches(v.config, v.automa) &&
    (v.lastGame === undefined || isEndedGame(v.lastGame))
  );
}

function isEndedGame(v: unknown): v is EndedGame {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    isConfig(v.config) &&
    Array.isArray(v.players) &&
    v.players.every(isPlayerSheet) &&
    automaMatches(v.config, v.automa) &&
    onePlayerVsAutoma(v.config, v.players)
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

function isSavedAutoma(config: GameConfig, v: unknown) {
  if (!config.automa) return v === undefined;
  return (
    isObject(v) &&
    isPoints(v.total) &&
    isRecordOf(v.breakdown, isPoints) &&
    isCount(v.tiebreak) &&
    isAutomaSheet(v.sheet)
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
    Array.isArray(v.sheet) &&
    v.sheet.length === v.players.length &&
    v.sheet.every(isPlayerSheet) &&
    isSavedAutoma(v.config, v.automa) &&
    onePlayerVsAutoma(v.config, v.players) &&
    Array.isArray(v.winners) &&
    v.winners.every(
      i =>
        isCount(i) &&
        (i as number) <
          (v.players as unknown[]).length + (v.automa === undefined ? 0 : 1)
    )
  );
}

export function isHistory(v: unknown): v is SavedGame[] {
  return Array.isArray(v) && v.every(isSavedGame);
}
