/**
 * Thin JSON wrapper around localStorage. Private browsing, disabled storage,
 * quota errors and corrupted values all degrade to an in-memory fallback, so
 * the app keeps working for the current visit even when nothing can be saved.
 */

export interface KeyValueStore {
  read<T>(key: string, fallback: T, isValid?: (value: unknown) => value is T): T;
  write(key: string, value: unknown): boolean;
  remove(key: string): void;
  /** False when values only live in memory for this visit (no storage, or a write failed). */
  readonly persistent: boolean;
}

// Storage that can be read is kept even when it can't be written to (say,
// it's already full), so saved games still show.
function resolveStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    window.localStorage.getItem("__wingspan_probe__");
    return window.localStorage;
  } catch {
    return null;
  }
}

function canWrite(storage: Storage): boolean {
  const probe = "__wingspan_probe__";
  try {
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createStore(storage: Storage | null = resolveStorage()): KeyValueStore {
  // Every write lands here first, so it always holds this visit's newest value,
  // even if the browser later refuses to store it.
  const memory = new Map<string, string>();
  // Keys whose newest value only made it into memory, with what storage
  // held at the time, to notice another tab writing there since.
  const unsaved = new Map<string, string | null>();
  let persistent = storage !== null && canWrite(storage);

  const stored = (key: string) => {
    try {
      return storage?.getItem(key);
    } catch {
      return undefined;
    }
  };

  return {
    get persistent() {
      return persistent;
    },
    read(key, fallback, isValid) {
      // Storage first, so changes made in another tab are seen. Memory takes
      // over for a key once storing it has failed, since it then holds the
      // newest copy; other keys still read from storage. If another tab has
      // stored that key since, its copy is newer and saved, so it wins.
      let raw = stored(key);
      if (unsaved.has(key)) {
        if (raw === unsaved.get(key)) raw = undefined;
        else unsaved.delete(key);
      }
      raw ??= memory.get(key);
      if (raw == null) return fallback;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isValid && !isValid(parsed)) return fallback;
        return parsed as typeof fallback;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      if (!storage) return false;
      try {
        storage.setItem(key, raw);
        unsaved.delete(key);
        return true;
      } catch {
        if (!unsaved.has(key)) unsaved.set(key, stored(key) ?? null);
        persistent = false;
        return false;
      }
    },
    remove(key) {
      memory.delete(key);
      unsaved.delete(key);
      try {
        storage?.removeItem(key);
      } catch {
        // Nothing else to do; the in-memory copy is gone.
      }
    },
  };
}

export const STORAGE_KEYS = {
  current: "wingspan-scoresheet:v1:current",
  history: "wingspan-scoresheet:v1:history",
} as const;
