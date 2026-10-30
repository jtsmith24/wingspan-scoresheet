import { isCurrentGame, isHistory, newGame, type CurrentGame, type SavedGame } from "./game";
import { createStore, STORAGE_KEYS, type KeyValueStore } from "./storage";

let store: KeyValueStore | null = null;

/** One shared store per page, created lazily so it only touches window in the browser. */
export function getStore(): KeyValueStore {
  store ??= createStore();
  return store;
}

/** For tests: start from a clean store. */
export function resetStoreForTests(next: KeyValueStore | null = null) {
  store = next;
}

export function loadHistory(): SavedGame[] {
  return getStore().read(STORAGE_KEYS.history, [], isHistory);
}

export function loadCurrentGame(): CurrentGame {
  const saved = getStore().read<CurrentGame | null>(
    STORAGE_KEYS.current,
    null,
    (v): v is CurrentGame | null => isCurrentGame(v),
  );
  return saved ?? newGame();
}

export const saveHistory = (history: SavedGame[]) => getStore().write(STORAGE_KEYS.history, history);
export const saveCurrentGame = (game: CurrentGame) => getStore().write(STORAGE_KEYS.current, game);
