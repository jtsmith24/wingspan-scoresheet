import { describe, expect, it } from "vitest";
import { createStore } from "./storage";

/** A localStorage stand-in that can be told to refuse writes for some keys. */
const fakeStorage = (refuse: (key: string) => boolean = () => false) => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (refuse(k)) throw new Error("QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    data,
  } as unknown as Storage & { data: Map<string, string> };
};

describe("store", () => {
  it("a failed write to one key doesn't hide what's stored under another", () => {
    const storage = fakeStorage(k => k === "current");
    storage.data.set("history", JSON.stringify(["old game"]));
    const store = createStore(storage);
    expect(store.write("current", { sheet: 1 })).toBe(false);
    expect(store.persistent).toBe(false);
    expect(store.read("history", [])).toEqual(["old game"]);
    expect(store.read("current", null)).toEqual({ sheet: 1 });
  });

  it("a key that failed reads from storage again once a write succeeds", () => {
    let full = true;
    const storage = fakeStorage(() => full);
    const store = createStore(storage);
    store.write("current", 1);
    full = false;
    store.write("current", 2);
    storage.data.set("current", "3"); // another tab
    expect(store.read("current", 0)).toBe(3);
  });

  it("another tab's newer save wins over a change that was never stored", () => {
    let full = true;
    const storage = fakeStorage(() => full);
    storage.data.set("history", JSON.stringify(["a"]));
    const store = createStore(storage);
    store.write("history", ["a", "mine"]);
    expect(store.read("history", [])).toEqual(["a", "mine"]);
    storage.data.set("history", JSON.stringify(["a", "theirs"])); // another tab
    expect(store.read("history", [])).toEqual(["a", "theirs"]);
    full = false;
    store.write("history", ["a", "theirs", "next"]);
    expect(store.read("history", [])).toEqual(["a", "theirs", "next"]);
  });

  it("storage that's full from the start still shows what's saved", () => {
    const storage = fakeStorage(() => true);
    storage.data.set("history", JSON.stringify(["old game"]));
    const store = createStore(storage);
    expect(store.persistent).toBe(false);
    expect(store.read("history", [])).toEqual(["old game"]);
  });

  it("works from memory alone when there's no storage", () => {
    const store = createStore(null);
    expect(store.write("current", 5)).toBe(false);
    expect(store.read("current", 0)).toBe(5);
  });
});
