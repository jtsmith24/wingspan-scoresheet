"use client";
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import SumTable from "./sum-table/SumTable";
import { Expansion, ExpansionTabs } from "./GameSetup";
import { PastGames } from "./PastGames";
import { useConfirm } from "./ConfirmDialog";
import {
  addToHistory,
  CurrentGame,
  emptyPlayer,
  fitPlayers,
  hasAnyScore,
  hasUnsavedScores,
  newGame,
  playerHasData,
  rememberNames,
  removeFromHistory,
  SavedGame,
  toSavedGame,
} from "@/lib/game";
import {
  getStore,
  loadCurrentGame,
  loadHistory,
  loadNames,
  saveCurrentGame,
  saveHistory,
  saveNames,
} from "@/lib/persistence";
import { STORAGE_KEYS } from "@/lib/storage";
import { withCodes } from "@/lib/names";
import { GameConfig, playerLimits } from "@/lib/rules";
import { displayName, PlayerSheet } from "@/lib/scoring";
import { Edition, themeFor } from "@/lib/theme";

const THEME_KEY = "wingspan-edition";
/** The palette on screen, read by an inline script in the layout before first paint. */
export const PALETTE_KEY = "wingspan-palette";

const subscribeNever = () => () => {};

/** Saved games live in browser storage, so the sheet only renders there. */
export const Scorepad = () => {
  const inBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  return inBrowser ? <LoadedScorepad /> : null;
};

const readPreferred = () => {
  try {
    return (localStorage.getItem(THEME_KEY) as Edition) ?? undefined;
  } catch {
    return undefined;
  }
};

const LoadedScorepad = () => {
  const [game, setGameState] = useState(loadCurrentGame);
  const [history, setHistory] = useState(loadHistory);
  const [names, setNames] = useState(loadNames);
  const [canPersist, setCanPersist] = useState(() => getStore().persistent);
  // The expansion picked most recently; the palette follows it while it's on.
  const [preferred, setPreferred] = useState(readPreferred);
  const [pastOpen, setPastOpen] = useState(false);
  const [dialog, ask] = useConfirm();

  const theme = themeFor(game.config, preferred);
  useEffect(() => {
    document.documentElement.dataset.edition = theme;
    try {
      localStorage.setItem(PALETTE_KEY, theme);
    } catch {}
  }, [theme]);

  // Another tab saved or deleted a game: pick up its history and names.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.history) setHistory(loadHistory());
      if (e.key === STORAGE_KEYS.names) setNames(loadNames());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const prefer = (edition: Edition) => {
    setPreferred(edition);
    try {
      localStorage.setItem(THEME_KEY, edition);
    } catch {}
  };

  // Every change is saved straight away so a closed tab loses nothing.
  const setGame = (next: CurrentGame) => {
    setGameState(next);
    setCanPersist(saveCurrentGame(next));
  };

  const edit = (changes: Partial<CurrentGame>) =>
    setGame({ ...game, ...changes, dirty: true });

  const setConfig = async (config: GameConfig) => {
    // Re-picking the tab that's already open isn't a change.
    const now = game.config;
    if (
      config.european === now.european &&
      config.oceania === now.oceania &&
      config.asia === now.asia &&
      config.americas === now.americas
    )
      return;
    const { max } = playerLimits(config);
    const dropped = game.players.slice(max);
    if (
      dropped.some(p => playerHasData(p, game.config)) &&
      !(await ask({
        message: `This mode is for up to ${max} players. Remove the extra columns and their scores?`,
        confirm: "Remove columns",
        danger: true,
      }))
    )
      return;
    edit({ config, players: fitPlayers(game.players, config) });
  };

  const setPlayerCount = async (count: number) => {
    const removed = game.players.slice(count);
    if (
      removed.some(p => playerHasData(p, game.config)) &&
      !(await ask({
        message: "Remove these players and their scores?",
        confirm: "Remove",
        danger: true,
      }))
    )
      return;
    const players: PlayerSheet[] = game.players.slice(0, count);
    while (players.length < count) players.push(emptyPlayer());
    edit({ players });
  };

  const removePlayer = async (col: number) => {
    if (
      playerHasData(game.players[col], game.config) &&
      !(await ask({
        message: `Remove ${displayName(game.players[col], col)} and their scores?`,
        confirm: "Remove",
        danger: true,
      }))
    )
      return;
    edit({ players: game.players.filter((_, i) => i !== col) });
  };

  const toggleExpansion = (expansion: Expansion) => {
    const { config } = game;
    const turningOn =
      expansion === "asia" ? config.asia === "off" : !config[expansion];
    if (turningOn) prefer(expansion);
    setConfig(
      expansion === "asia"
        ? { ...config, asia: turningOn ? "standard" : "off" }
        : { ...config, [expansion]: turningOn }
    );
  };

  // Tabs pick one box at a time: the base game plus at most one expansion.
  const selectOnly = (edition: Edition) => {
    const { config } = game;
    if (edition !== "base") prefer(edition);
    setConfig({
      european: edition === "european",
      oceania: edition === "oceania",
      americas: edition === "americas",
      asia:
        edition !== "asia"
          ? "off"
          : config.asia === "off"
            ? "standard"
            : config.asia,
    });
  };

  // History is re-read before every change so a second open tab can't
  // overwrite games saved in the first.
  const saveGame = () => {
    const saved = toSavedGame(game);
    const nextHistory = addToHistory(loadHistory(), saved);
    // If storage is full the game is still kept for this visit, and the
    // storage note below explains it won't last.
    if (!saveHistory(nextHistory)) setCanPersist(false);
    const nextNames = rememberNames(
      loadNames(),
      game.players.map(p => p.name)
    );
    saveNames(nextNames);
    setHistory(nextHistory);
    setNames(nextNames);
    setGame({ ...game, savedAs: saved.id, dirty: false });
  };

  // The players carry over with their names and header codes.
  const startNewGame = async (
    config = game.config,
    playerNames = game.players.map(p => p.name),
    playerCodes: (string | undefined)[] = withCodes(game.players)
  ) => {
    if (
      hasUnsavedScores(game) &&
      !(await ask({
        message: "Start a new game? These scores haven't been saved.",
        confirm: "Start new game",
        danger: true,
      }))
    )
      return false;
    setGame(
      newGame(
        config,
        playerNames,
        playerCodes.map(c => c || undefined)
      )
    );
    return true;
  };

  // For a different group: blank names and scores, same setup and seats.
  const clearSheet = async () => {
    if (
      hasUnsavedScores(game) &&
      !(await ask({
        message: "Clear the sheet? These scores haven't been saved.",
        confirm: "Clear",
        danger: true,
      }))
    )
      return;
    setGame(
      newGame(
        game.config,
        game.players.map(() => "")
      )
    );
  };
  const sheetIsBlank =
    !hasAnyScore(game) && game.players.every(p => !p.name.trim());

  const closePast = useCallback(() => setPastOpen(false), []);

  const deleteGame = (id: string) => {
    const next = removeFromHistory(loadHistory(), id);
    setHistory(next);
    saveHistory(next);
    // The sheet on screen was that game: saving it again makes a new entry.
    if (game.savedAs === id) setGame({ ...game, savedAs: undefined });
  };

  const playAgain = async (saved: SavedGame) => {
    // Unnamed players were saved as "Player 2" and so on; start those blank.
    const playerNames = saved.players.map(p =>
      /^Player \d+$/.test(p.name) ? "" : p.name
    );
    const playerCodes = saved.players.map((p, i) =>
      playerNames[i] ? p.code : undefined
    );
    if (await startNewGame(saved.config, playerNames, playerCodes))
      setPastOpen(false);
  };

  const { config, players } = game;
  const limits = playerLimits(config);
  const saveLabel = !game.savedAs
    ? "Save game"
    : game.dirty
      ? "Update saved game"
      : "Saved";

  return (
    <div className="scorepad">
      <div className="sheet-with-tabs">
        <ExpansionTabs
          config={config}
          onToggle={toggleExpansion}
          onAsiaMode={asia => setConfig({ ...config, asia })}
          onSelectOnly={selectOnly}
        />
        <SumTable
          game={game}
          onPlayersChange={next => edit({ players: next })}
          rememberedNames={names}
          onAddPlayer={
            players.length < limits.max
              ? () => setPlayerCount(players.length + 1)
              : undefined
          }
          onRemovePlayer={
            players.length > limits.min ? removePlayer : undefined
          }
        />
      </div>

      <div className="sheet-actions hand-caps">
        <button
          type="button"
          className="ink-button ink-button-primary"
          onClick={saveGame}
          disabled={!hasAnyScore(game) || (!!game.savedAs && !game.dirty)}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          className="ink-button"
          onClick={() => startNewGame()}
        >
          New game
        </button>
        <button
          type="button"
          className="text-link clear-link"
          onClick={clearSheet}
          disabled={sheetIsBlank}
        >
          Clear
        </button>
        {history.length > 0 && (
          <button
            type="button"
            className="text-link history-link"
            onClick={() => setPastOpen(true)}
          >
            Past games · {history.length}
          </button>
        )}
      </div>
      {pastOpen && (
        <PastGames
          history={history}
          onClose={closePast}
          onDelete={deleteGame}
          onPlayAgain={playAgain}
          ask={ask}
        />
      )}
      {dialog}
      {!canPersist && (
        <p className="storage-note">
          This browser isn&apos;t letting the app store anything, so scores will
          be lost when you close the page.
        </p>
      )}
    </div>
  );
};
