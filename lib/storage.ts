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

function resolveStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__wingspan_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStore(storage: Storage | null = resolveStorage()): KeyValueStore {
  // Every write lands here first, so it always holds this visit's newest value,
  // even if the browser later refuses to store it.
  const memory = new Map<string, string>();
  // Keys whose newest value only made it into memory.
  const unsaved = new Set<string>();
  let persistent = storage !== null;

  return {
    get persistent() {
      return persistent;
    },
    read(key, fallback, isValid) {
      // Storage first, so changes made in another tab are seen. Memory takes
      // over for a key once storing it has failed, since it then holds the
      // newest copy; other keys still read from storage.
      let raw: string | null | undefined;
      if (storage && !unsaved.has(key)) {
        try {
          raw = storage.getItem(key);
        } catch {
          raw = undefined;
        }
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
        unsaved.add(key);
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
