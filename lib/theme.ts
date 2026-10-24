import type { GameConfig } from "./rules";

/** Each palette follows a box's cover art. */
export type Edition = "base" | "european" | "oceania" | "asia" | "americas";

// Newest release first: the fallback when the chosen edition is switched off.
const NEWEST_FIRST: Edition[] = ["americas", "asia", "oceania", "european"];

export function isEditionActive(edition: Edition, config: GameConfig): boolean {
  if (edition === "base") return true;
  if (edition === "asia") return config.asia !== "off";
  return config[edition];
}

/**
 * The palette for a game: the expansion picked most recently if it's still
 * on, otherwise the newest expansion in play, otherwise the base game.
 */
export function themeFor(config: GameConfig, preferred?: Edition): Edition {
  if (preferred && isEditionActive(preferred, config)) return preferred;
  return NEWEST_FIRST.find(e => isEditionActive(e, config)) ?? "base";
}
