import type { GameConfig } from "./rules";

/** The palette on screen, read by an inline script in the layout before first paint. */
export const PALETTE_KEY = "wingspan-palette";

/** Each palette follows a box's cover art. */
export type Edition = "base" | "european" | "oceania" | "asia" | "americas";

// The checklist's order, so a mix always looks the same however it was picked.
const EXPANSIONS: Edition[] = ["european", "oceania", "asia", "americas"];

export function isEditionActive(edition: Edition, config: GameConfig): boolean {
  if (edition === "base") return true;
  if (edition === "asia") return config.asia !== "off";
  return config[edition];
}

/** The palettes a game is coloured by: its expansions, or the base game. */
export function paletteFor(config: GameConfig): Edition[] {
  const on = EXPANSIONS.filter(e => isEditionActive(e, config));
  return on.length ? on : ["base"];
}

/**
 * Colours the page: one expansion uses its own washes; a mix gives each
 * expansion its own cloud, main colours first, then their lighter ones.
 * Self-contained, because it's also inlined into the page to run before
 * first paint.
 */
export function applyPalette(palette: string) {
  const list = palette.split("+");
  const root = document.documentElement;
  root.dataset.edition = list.length > 1 ? "mix" : list[0];
  const clouds =
    list.length > 1
      ? [
          ...list.map(e => `var(--${e}-1)`),
          ...list.map(e => `var(--${e}-2)`),
        ]
      : [];
  for (let i = 0; i < 4; i++) {
    if (clouds[i]) root.style.setProperty(`--wash-${i + 1}`, clouds[i]);
    else root.style.removeProperty(`--wash-${i + 1}`);
  }
}
