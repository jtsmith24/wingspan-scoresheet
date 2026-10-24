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
import { GameConfig, playerLimits } from "@/lib/rules";
import { PlayerSheet } from "@/lib/scoring";
import { Edition, themeFor } from "@/lib/theme";

const THEME_KEY = "wingspan-edition";

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

  const theme = themeFor(game.config, preferred);
  useEffect(() => {
    document.documentElement.dataset.edition = theme;
  }, [theme]);

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

  const setConfig = (config: GameConfig) => {
    const dropped = game.players.slice(playerLimits(config).max);
    if (
      dropped.some(playerHasData) &&
      !window.confirm("This mode has fewer players. Remove the extra columns?")
    )
      return;
    edit({ config, players: fitPlayers(game.players, config) });
  };

  const setPlayerCount = (count: number) => {
    const removed = game.players.slice(count);
    if (
      removed.some(playerHasData) &&
      !window.confirm("Remove this player and their scores?")
    )
      return;
    const players: PlayerSheet[] = game.players.slice(0, count);
    while (players.length < count) players.push(emptyPlayer());
    edit({ players });
  };

  const removePlayer = (col: number) => {
    if (
      playerHasData(game.players[col]) &&
      !window.confirm("Remove this player and their scores?")
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

  const saveGame = () => {
    const saved = toSavedGame(game);
    const nextHistory = addToHistory(history, saved);
    const nextNames = rememberNames(
      names,
      game.players.map(p => p.name)
    );
    setHistory(nextHistory);
    setNames(nextNames);
    saveHistory(nextHistory);
    saveNames(nextNames);
    setGame({ ...game, savedAs: saved.id, dirty: false });
  };

  const startNewGame = (
    config = game.config,
    playerNames = game.players.map(p => p.name)
  ) => {
    if (
      hasUnsavedScores(game) &&
      !window.confirm("Start a new game? These scores haven't been saved.")
    )
      return false;
    setGame(newGame(config, playerNames));
    return true;
  };

  const closePast = useCallback(() => setPastOpen(false), []);

  const deleteGame = (id: string) => {
    const next = removeFromHistory(history, id);
    setHistory(next);
    saveHistory(next);
    // The sheet on screen was that game: saving it again makes a new entry.
    if (game.savedAs === id) setGame({ ...game, savedAs: undefined });
  };

  const playAgain = (saved: SavedGame) => {
    // Unnamed players were saved as "Player 2" and so on; start those blank.
    const playerNames = saved.players.map(p =>
      /^Player \d+$/.test(p.name) ? "" : p.name
    );
    if (startNewGame(saved.config, playerNames)) setPastOpen(false);
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
        />
      )}
      {!canPersist && (
        <p className="storage-note">
          This browser isn&apos;t letting the app store anything, so scores will
          be lost when you close the page.
        </p>
      )}
    </div>
  );
};
