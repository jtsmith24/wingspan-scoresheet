"use client";
// Temporary: three ways to colour the page when several expansions are on.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";
import SumTable from "@/components/sum-table/SumTable";
import { ExpansionTabs, Expansion } from "@/components/GameSetup";
import { newGame } from "@/lib/game";
import { GameConfig } from "@/lib/rules";

type Washes = [string, string, string];

// The same washes as app/globals.css.
const PALETTES: Record<Expansion, Washes> = {
  european: ["#a49ad3", "#cdbfe6", "#e3d9ef"],
  oceania: ["#f0cf72", "#f4e2a6", "#e8c9a0"],
  asia: ["#eaa7b8", "#f4d0d6", "#c9dfc6"],
  americas: ["#97c79a", "#cfe3b8", "#f2d89b"],
};

const COMBOS: Expansion[][] = [
  ["oceania", "european"],
  ["asia", "americas"],
  ["european", "americas", "oceania"],
  ["european", "oceania", "asia", "americas"],
];

const LABELS: Record<Expansion, string> = {
  european: "European",
  oceania: "Oceania",
  asia: "Asia",
  americas: "Americas",
};

type Vars = Record<string, string>;

/** Today: the expansion ticked last wins. */
const today = (on: Expansion[]): Vars => {
  const [w1, w2, w3] = PALETTES[on[on.length - 1]];
  return { "--wash-1": w1, "--wash-2": w2, "--wash-3": w3, "--mk-tab": w1 };
};

/** 1: each expansion brings its own cloud of colour. */
const clouds = (on: Expansion[]): Vars => {
  const order = [...on.map(e => PALETTES[e][0]), ...on.map(e => PALETTES[e][1])];
  return {
    "--wash-1": order[0],
    "--wash-2": order[1],
    "--wash-3": order[2],
    "--wash-4": order[3],
    "--mk-tab": `linear-gradient(90deg, ${on.map(e => PALETTES[e][0]).join(", ")})`,
  };
};

/** 2: every wash averaged across the expansions in play. */
const blend = (on: Expansion[]): Vars => {
  const avg = (k: number) =>
    on
      .map(e => PALETTES[e][k])
      .reduce((acc, c, i) =>
        i === 0 ? c : `color-mix(in oklab, ${acc} ${(i / (i + 1)) * 100}%, ${c})`
      );
  return {
    "--wash-1": avg(0),
    "--wash-2": avg(1),
    "--wash-3": avg(2),
    "--mk-tab": avg(0),
  };
};

/** 3: one palette of its own for any mix: terracotta, sand and sage. */
const mixed = (): Vars => ({
  "--wash-1": "#e2b48f",
  "--wash-2": "#d8cbb8",
  "--wash-3": "#c3d3bd",
  "--mk-tab": "#e2b48f",
});

const configFor = (on: Expansion[]): GameConfig => ({
  european: on.includes("european"),
  oceania: on.includes("oceania"),
  americas: on.includes("americas"),
  asia: on.includes("asia") ? "standard" : "off",
});

const noop = () => {};

const Frame = ({ on, vars }: { on: Expansion[]; vars: Vars }) => {
  const config = configFor(on);
  const game = newGame(config, ["Jordan", "Sam"]);
  return (
    <figure className="mk-fig">
      <div className="mk-frame" style={vars} aria-hidden="true">
        <h1 className="wordmark">WINGSPAN</h1>
        <div className="sheet-with-tabs">
          <ExpansionTabs
            config={config}
            theme="base"
            onToggle={noop}
            onAsiaMode={noop}
            onBase={noop}
          />
          <SumTable game={game} onPlayersChange={noop} />
        </div>
      </div>
      <figcaption className="hand-caps">
        {on.map(e => LABELS[e]).join(" + ")}
      </figcaption>
      <div className="mk-swatches">
        {Object.entries(vars)
          .filter(([k, v]) => k !== "--mk-tab" && v !== "transparent")
          .map(([k, v]) => (
            <span key={k} style={{ background: v }} />
          ))}
      </div>
    </figure>
  );
};

const OPTIONS: { title: string; note: string; vars: (on: Expansion[]) => Vars }[] = [
  {
    title: "1 · A cloud for each expansion",
    note: "Each expansion's own colour sits in its own corner of the page and they fade into each other. Nothing is averaged, so nothing goes muddy, and every combination looks different.",
    vars: clouds,
  },
  {
    title: "2 · One blended tint",
    note: "The expansions' colours are averaged into new ones. Every combination gets a tint of its own; some pairs come out duller than either colour alone.",
    vars: blend,
  },
  {
    title: "3 · One palette for any mix",
    note: "Two or more expansions switch to a palette that belongs to none of them: terracotta, sand and sage. Calm and always tidy, but every mix looks the same.",
    vars: mixed,
  },
  {
    title: "Today, for comparison",
    note: "The expansion ticked last colours the page (here, the last one in each caption).",
    vars: today,
  },
];

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        The page&apos;s colour when more than one expansion is ticked. One
        expansion on its own keeps its colour as it is now; only mixes change.
        The dots under each phone are the colours used.
      </p>
      {OPTIONS.map(o => (
        <section key={o.title} className="mk-option">
          <h2 className="hand-caps">{o.title}</h2>
          <p className="mk-note">{o.note}</p>
          <div className="mk-row">
            {COMBOS.map(on => (
              <Frame key={on.join()} on={on} vars={o.vars(on)} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
