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
import { useDialog } from "./ConfirmDialog";
import {
  addToHistory,
  CurrentGame,
  emptyPlayer,
  fitPlayers,
  hasAnyScore,
  missingScores,
  newGame,
  playerHasData,
  removeFromHistory,
  SavedGame,
  toSavedGame,
} from "@/lib/game";
import {
  getStore,
  loadCurrentGame,
  loadHistory,
  saveCurrentGame,
  saveHistory,
} from "@/lib/persistence";
import { STORAGE_KEYS } from "@/lib/storage";
import { withCodes } from "@/lib/names";
import { GameConfig, playerLimits, sameConfig } from "@/lib/rules";
import { displayName, PlayerSheet, scoreGame } from "@/lib/scoring";
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
  const [canPersist, setCanPersist] = useState(() => getStore().persistent);
  // The expansion picked most recently; the palette follows it while it's on.
  const [preferred, setPreferred] = useState(readPreferred);
  // Open, and optionally on one game.
  const [pastOpen, setPastOpen] = useState<boolean | string>(false);
  const [dialog, choose, ask] = useDialog();

  const theme = themeFor(game.config, preferred);
  useEffect(() => {
    document.documentElement.dataset.edition = theme;
    try {
      localStorage.setItem(PALETTE_KEY, theme);
    } catch {}
  }, [theme]);

  // Another tab changed the sheet or saved games: show its version, so a
  // stale copy here can't overwrite newer work there.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.history) setHistory(loadHistory());
      if (e.key === STORAGE_KEYS.current) setGameState(loadCurrentGame());
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
  // Once any write has failed (say, history no longer fits), the store stays
  // non-persistent, so the note below doesn't vanish on the next good write.
  const setGame = (next: CurrentGame) => {
    setGameState(next);
    saveCurrentGame(next);
    setCanPersist(getStore().persistent);
  };

  // Touching the new sheet means it's in use: Undo for the last game goes.
  const edit = (changes: Partial<CurrentGame>) =>
    setGame({ ...game, ...changes, lastGame: undefined });

  const setConfig = async (config: GameConfig) => {
    // Re-picking the tab that's already open isn't a change.
    if (sameConfig(config, game.config)) return;
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

  const baseOnly = () =>
    setConfig({
      european: false,
      oceania: false,
      americas: false,
      asia: "off",
    });

  // History is re-read before every change so a second open tab can't
  // overwrite games saved in the first. If storage is full the game is still
  // kept for this visit, and the storage note below explains it won't last.
  const writeHistory = (change: (h: SavedGame[]) => SavedGame[]) => {
    const next = change(loadHistory());
    saveHistory(next);
    setHistory(next);
  };

  // Ends the game on the sheet: into Past games, and a fresh sheet with the
  // same players. A part-filled sheet or an unsettled tie asks first.
  const endGame = async () => {
    const missing = missingScores(game);
    const { outcome } = scoreGame(game.config, game.players);
    const question =
      missing > 0
        ? {
            message: `${missing} score ${missing === 1 ? "box is" : "boxes are"} empty. Save as unfinished?`,
            confirm: "Save unfinished",
          }
        : outcome.decision === "needs-food"
          ? {
              message:
                "The tie isn't settled: unused food is still empty. End the game anyway?",
              confirm: "End game",
            }
          : null;
    if (question) {
      const answer = await choose({
        message: question.message,
        actions: [
          { id: "keep", label: "Keep playing" },
          { id: "end", label: question.confirm, primary: true },
        ],
      });
      if (answer !== "end") return;
    }
    const saved = toSavedGame(game);
    writeHistory(h => addToHistory(h, saved));
    const codes = withCodes(game.players);
    setGame({
      ...newGame(
        game.config,
        game.players.map(p => p.name),
        codes.map(c => c || undefined)
      ),
      lastGame: { id: saved.id, config: game.config, players: game.players },
    });
  };

  // Puts the last game back on the sheet, exactly as it was.
  const undoEnd = () => {
    const last = game.lastGame;
    if (!last) return;
    writeHistory(h => removeFromHistory(h, last.id));
    setGame({ config: last.config, players: last.players });
  };

  const clearNames = () =>
    edit({
      players: game.players.map(p => ({ ...p, name: "", code: undefined })),
    });

  const closePast = useCallback(() => setPastOpen(false), []);

  const deleteGame = (id: string) =>
    writeHistory(h => removeFromHistory(h, id));

  // A fix to a past game keeps its place and its date.
  const editGame = (id: string, players: PlayerSheet[]) => {
    const old = loadHistory().find(g => g.id === id);
    if (!old) return;
    writeHistory(h =>
      addToHistory(
        h,
        toSavedGame({ config: old.config, players }, new Date(), id)
      )
    );
  };

  const playAgain = async (saved: SavedGame) => {
    const scored = hasAnyScore(game);
    if (
      scored &&
      !(await ask({
        message:
          "Play again? The game on the sheet will be saved to Past games first.",
        confirm: "Save it and play again",
      }))
    )
      return;
    if (scored) writeHistory(h => addToHistory(h, toSavedGame(game)));
    // Unnamed players were saved as "Player 2" and so on; start those blank.
    const playerNames = saved.players.map(p =>
      /^Player \d+$/.test(p.name) ? "" : p.name
    );
    const playerCodes = saved.players.map((p, i) =>
      playerNames[i] ? p.code : undefined
    );
    setGame(newGame(saved.config, playerNames, playerCodes));
    setPastOpen(false);
  };

  const { config, players } = game;
  const limits = playerLimits(config);
  const scored = hasAnyScore(game);
  const last = game.lastGame && history.find(g => g.id === game.lastGame?.id);

  return (
    <div className="scorepad">
      <div className="sheet-with-tabs">
        <ExpansionTabs
          config={config}
          theme={theme}
          onToggle={toggleExpansion}
          onAsiaMode={asia => setConfig({ ...config, asia })}
          onBase={baseOnly}
        />
        <SumTable
          game={game}
          onPlayersChange={next => edit({ players: next })}
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

      {last && (
        <p className="last-game hand-caps">
          ✓ Last game:{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setPastOpen(last.id)}
          >
            {last.summary}
          </button>{" "}
          ·{" "}
          <button type="button" className="text-link" onClick={undoEnd}>
            Undo
          </button>
        </p>
      )}
      <div className="sheet-actions hand-caps">
        <button
          type="button"
          className="ink-button ink-button-primary"
          onClick={endGame}
          disabled={!scored}
        >
          End game
        </button>
        {!scored && players.some(p => p.name.trim()) && (
          <button type="button" className="text-link" onClick={clearNames}>
            Clear names
          </button>
        )}
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
          initialOpen={pastOpen === true ? undefined : pastOpen}
          onClose={closePast}
          onDelete={deleteGame}
          onEdit={editGame}
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
