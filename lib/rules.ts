/**
 * Scoresheet layout and game modes, taken from the official Stonemaier
 * scorepads:
 *  - Base game: Birds, Bonus cards, End-of-round goals, Eggs, Food on cards,
 *    Tucked cards.
 *  - European Expansion: same rows as the base game (it adds cards and goals,
 *    not new scoring categories).
 *  - Oceania Expansion: adds a "Nectar" row scored 5/2 for majority per habitat.
 *  - Asia (Duet mode, 2 players): adds "Duet tokens in largest contiguous group".
 *  - Asia (Flock mode, 6-7 players): same rows, but nectar ties are "friendly".
 *  - Americas Expansion: adds the hummingbird track, scored at game end from
 *    each token's position. It can be negative.
 *  - Automa (solo opponent; official Automa scoresheet and rulebooks): scores
 *    birds (face-up points plus 3/4/5 per face-down bird by difficulty),
 *    goals, eggs, eggs from cache/hoard tokens, Duet tokens, nectar and the
 *    hummingbird track. No bonus cards, food on cards or tucked cards.
 */

export type CategoryId =
  | "birds"
  | "bonus"
  | "goals"
  | "eggs"
  | "cache"
  | "food"
  | "tucked"
  | "duet"
  | "hummingbirds"
  | "nectar";

/** The bands printed down the left edge of the real scoresheet. */
export type CategoryGroup = "cards" | "each" | "track" | "majority";

export interface Category {
  id: CategoryId;
  label: string;
  group: CategoryGroup;
  /** Short help text shown to screen readers and as a hint. */
  hint: string;
  /** Hummingbird tokens can end on negative spaces. */
  allowsNegative?: boolean;
}

/** "standard" is a normal 1-5 player game with Asia cards: no scoring changes. */
export type AsiaMode = "off" | "standard" | "duet" | "flock";

/** Eaglet, Eagle or Eagle-eyed Eagle: what each face-down bird is worth. */
export type AutomaDifficulty = 3 | 4 | 5;

export const AUTOMA_DIFFICULTIES: { id: AutomaDifficulty; label: string }[] = [
  { id: 3, label: "Eaglet" },
  { id: 4, label: "Eagle" },
  { id: 5, label: "Eagle-eyed Eagle" },
];

export interface AutomaSettings {
  difficulty: AutomaDifficulty;
  /** The optional Hoard variant (Oceania Automa rules): tokens without Asia or Americas. */
  hoard: boolean;
}

export interface GameConfig {
  european: boolean;
  oceania: boolean;
  asia: AsiaMode;
  americas: boolean;
  /** Playing solo against the Automa. Never with Flock. */
  automa?: AutomaSettings;
}

export const DEFAULT_CONFIG: GameConfig = {
  european: false,
  oceania: false,
  asia: "off",
  americas: false,
};

export const HABITATS = ["forest", "grassland", "wetland"] as const;
export type Habitat = (typeof HABITATS)[number];

export const HABITAT_LABELS: Record<Habitat, string> = {
  forest: "Forest",
  grassland: "Grassland",
  wetland: "Wetland",
};

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  cards: "Amount on cards",
  each: "1 point each",
  track: "Track",
  majority: "5 / 2",
};

const BASE_CATEGORIES: Category[] = [
  { id: "birds", label: "Birds", group: "cards", hint: "Points printed on your birds" },
  { id: "bonus", label: "Bonus cards", group: "cards", hint: "Points from your bonus cards" },
  {
    id: "goals",
    label: "End-of-round goals",
    group: "cards",
    hint: "Points from the goal board",
  },
  { id: "eggs", label: "Eggs", group: "each", hint: "1 point per egg" },
  {
    id: "cache",
    label: "Eggs from cache/hoard",
    group: "each",
    hint: "The Automa's cache/hoard tokens, before they become eggs (1 egg per 5, 4 or 3 tokens by difficulty). Leave these eggs out of its Eggs row",
  },
  { id: "food", label: "Food on cards", group: "each", hint: "1 point per cached food" },
  { id: "tucked", label: "Tucked cards", group: "each", hint: "1 point per tucked card" },
];

const DUET_CATEGORY: Category = {
  id: "duet",
  label: "Duet tokens",
  group: "each",
  hint: "1 point per token in your largest contiguous group on the Duet map (count only that group)",
};

const HUMMINGBIRD_CATEGORY: Category = {
  id: "hummingbirds",
  label: "Hummingbirds",
  group: "track",
  hint: "Points from where your tokens end on the hummingbird track (can be negative)",
  allowsNegative: true,
};

const NECTAR_CATEGORY: Category = {
  id: "nectar",
  label: "Nectar",
  group: "majority",
  hint: "Per habitat: most spent nectar scores 5, second most scores 2",
};

/**
 * Rows of the scoresheet for a given setup, in scorepad order. The
 * hummingbird track isn't used in Flock mode: the Americas FAQ says it
 * doesn't scale to 6-7 players, though the Americas birds still play.
 */
export function categoriesFor(config: GameConfig): Category[] {
  const rows = BASE_CATEGORIES.filter(
    c => c.id !== "cache" || automaTokensInPlay(config)
  );
  if (config.asia === "duet") rows.push(DUET_CATEGORY);
  if (hummingbirdsInPlay(config)) rows.push(HUMMINGBIRD_CATEGORY);
  if (config.oceania) rows.push(NECTAR_CATEGORY);
  return rows;
}

export const hummingbirdsInPlay = (config: GameConfig) =>
  config.americas && config.asia !== "flock";

/**
 * The Automa's cache (standard in the Asia and Americas Automa rules) or
 * hoard (an optional variant with any expansions): tokens that become eggs at
 * the end. Both score the same, so the Hoard choice only matters without
 * Asia or Americas.
 */
export const automaTokensInPlay = (config: GameConfig) =>
  !!config.automa &&
  (config.asia !== "off" || config.americas || config.automa.hoard);

/** Cache/hoard tokens per egg: 5, 4 or 3 by difficulty. */
export const tokensPerEgg = (difficulty: AutomaDifficulty) => 8 - difficulty;

/**
 * Whether a row has a box to fill in. The Automa has no bonus cards, cached
 * food or tucked cards; only the Automa has cache/hoard tokens.
 */
export const scoredBy = (id: CategoryId, side: "player" | "automa") =>
  side === "automa"
    ? id !== "bonus" && id !== "food" && id !== "tucked"
    : id !== "cache";

export const difficultyLabel = (difficulty: AutomaDifficulty) =>
  AUTOMA_DIFFICULTIES.find(d => d.id === difficulty)?.label ?? "";

export interface PlayerLimits {
  min: number;
  max: number;
}

/** Player counts allowed by each mode. Base game is 1-5 (1 = solo vs. Automa). */
export function playerLimits(config: GameConfig): PlayerLimits {
  if (config.automa) return { min: 1, max: 1 };
  if (config.asia === "duet") return { min: 2, max: 2 };
  if (config.asia === "flock") return { min: 6, max: 7 };
  return { min: 1, max: 5 };
}

/** Flock mode scores nectar majorities with friendly ties (Asia rulebook p. 11). */
export function usesFriendlyNectarTies(config: GameConfig): boolean {
  return config.asia === "flock";
}

export function sameConfig(a: GameConfig, b: GameConfig): boolean {
  return (
    a.european === b.european &&
    a.oceania === b.oceania &&
    a.asia === b.asia &&
    a.americas === b.americas &&
    a.automa?.difficulty === b.automa?.difficulty &&
    a.automa?.hoard === b.automa?.hoard
  );
}

export function describeConfig(config: GameConfig): string {
  const parts = ["Base game"];
  if (config.european) parts.push("European");
  if (config.oceania) parts.push("Oceania");
  if (config.asia === "standard") parts.push("Asia");
  if (config.asia === "duet") parts.push("Asia (Duet)");
  if (config.asia === "flock") parts.push("Asia (Flock)");
  if (config.americas) parts.push("Americas");
  const text = parts.join(" + ");
  if (!config.automa) return text;
  const hoard =
    config.automa.hoard && config.asia === "off" && !config.americas
      ? " + Hoard"
      : "";
  return `${text} · vs Automa (${difficultyLabel(config.automa.difficulty)}${hoard})`;
}
