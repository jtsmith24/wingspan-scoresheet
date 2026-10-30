"use client";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import SumTable from "./sum-table/SumTable";
import { Expansion, ExpansionTabs } from "./GameSetup";
import { PastGames } from "./PastGames";
import { Ask, useDialog } from "./ConfirmDialog";
import { SavedStamp } from "./SavedStamp";
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
import {
  GameConfig,
  hummingbirdsInPlay,
  playerLimits,
  sameConfig,
} from "@/lib/rules";
import { displayName, PlayerSheet, scoreGame } from "@/lib/scoring";
import { applyPalette, paletteFor, PALETTE_KEY } from "@/lib/theme";

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

const LoadedScorepad = () => {
  const [game, setGameState] = useState(loadCurrentGame);
  const [history, setHistory] = useState(loadHistory);
  const [canPersist, setCanPersist] = useState(() => getStore().persistent);
  // Open, and optionally on one game.
  const [pastOpen, setPastOpen] = useState<boolean | string>(false);
  const [dialog, , askDialog] = useDialog();
  // The fresh sheet waiting while an ended game's scores lift off.
  const [ending, setEnding] = useState<CurrentGame>();
  // Bumped each time a game ends, to replay the Saved stamp.
  const [stamp, setStamp] = useState(0);

  const palette = paletteFor(game.config);
  const paletteKey = palette.join("+");
  useEffect(() => {
    applyPalette(paletteKey);
    try {
      localStorage.setItem(PALETTE_KEY, paletteKey);
    } catch {}
  }, [paletteKey]);

  // The sheet as it is now, for questions that were asked about it earlier.
  const latest = useRef(game);
  useLayoutEffect(() => {
    latest.current = game;
  }, [game]);

  // Asks about the sheet, and only says yes if it's still the same sheet
  // when answered: another tab may have changed it in the meantime.
  const ask: Ask = async question => {
    const before = latest.current;
    return (await askDialog(question)) && latest.current === before;
  };

  // Another tab changed the sheet or saved games: show its version, so a
  // stale copy here can't overwrite newer work there. That includes a sheet
  // still clearing here after End game: the other tab's change is newer.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.history) setHistory(loadHistory());
      if (e.key === STORAGE_KEYS.current) {
        setEnding(undefined);
        setGameState(loadCurrentGame());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ending) return;
    const swap = setTimeout(() => {
      setGameState(ending);
      setEnding(undefined);
    }, 550);
    return () => clearTimeout(swap);
  }, [ending]);

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
    setCanPersist(getStore().persistent);
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
    if (question && !(await ask(question))) return;
    const saved = toSavedGame(game);
    writeHistory(h => addToHistory(h, saved));
    const codes = withCodes(game.players);
    const next = {
      ...newGame(
        game.config,
        game.players.map(p => p.name),
        codes.map(c => c || undefined)
      ),
      lastGame: { id: saved.id, config: game.config, players: game.players },
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGame(next);
      return;
    }
    // Stored straight away; the sheet on screen catches up once the stamp
    // has settled and the scores have lifted off.
    saveCurrentGame(next);
    setCanPersist(getStore().persistent);
    setEnding(next);
    setStamp(s => s + 1);
  };

  // Puts the last game back on the sheet, exactly as it was.
  const undoEnd = () => {
    const last = game.lastGame;
    if (!last) return;
    writeHistory(h => removeFromHistory(h, last.id));
    setGame({ config: last.config, players: last.players });
  };

  // A blank table without keeping the game; the expansions stay.
  const clearSheet = async () => {
    if (
      hasAnyScore(game) &&
      !(await ask({
        message:
          "Clear the sheet? Names and scores will be erased, and this game won't be saved.",
        confirm: "Clear",
        danger: true,
      }))
    )
      return;
    edit({ players: newGame(game.config).players });
  };

  const closePast = useCallback(() => setPastOpen(false), []);

  const deleteGame = (id: string) =>
    writeHistory(h => removeFromHistory(h, id));

  // A fix to a past game keeps its place and its date.
  // Not if it was deleted or changed in another tab since editing began.
  const editGame = (id: string, players: PlayerSheet[], base: string) => {
    const old = loadHistory().find(g => g.id === id);
    if (!old || JSON.stringify(old.sheet) !== base) {
      setHistory(loadHistory());
      return false;
    }
    writeHistory(h =>
      addToHistory(
        h,
        toSavedGame({ config: old.config, players }, new Date(), id)
      )
    );
    return true;
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
    <div className="scorepad" inert={!!ending}>
      <div className={`sheet-with-tabs${ending ? " is-ending" : ""}`}>
        <ExpansionTabs
          config={config}
          palette={palette}
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
        {stamp > 0 && <SavedStamp key={stamp} onDone={() => setStamp(0)} />}
      </div>

      {config.americas && !hummingbirdsInPlay(config) && (
        <p className="sheet-footnote hand-caps">
          * No hummingbird track with 6–7 players (Flock). Americas birds
          still play.
        </p>
      )}
      {last && (
        <p className={`last-game hand-caps${stamp > 0 ? " just-ended" : ""}`}>
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
      {/* End game comes last, on the right, nearer a right thumb. */}
      <div className="sheet-actions hand-caps">
        {history.length > 0 && (
          <button
            type="button"
            className="text-link history-link"
            onClick={() => setPastOpen(true)}
          >
            Past games · {history.length}
          </button>
        )}
        {(scored || players.some(p => p.name.trim())) && (
          <button type="button" className="text-link" onClick={clearSheet}>
            Clear
          </button>
        )}
        <button
          type="button"
          className="ink-button ink-button-primary"
          onClick={endGame}
          disabled={!scored}
        >
          End game
        </button>
      </div>
      {pastOpen && (
        <PastGames
          history={history}
          initialOpen={pastOpen === true ? undefined : pastOpen}
          onClose={closePast}
          onDelete={deleteGame}
          onEdit={editGame}
          onPlayAgain={playAgain}
          ask={askDialog}
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
