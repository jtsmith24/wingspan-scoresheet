"use client";
// Temporary: three ways to switch a hummingbird score between plus and minus.
import { useState } from "react";
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

const PLAYERS = ["JOR", "SAM", "ALX"];
const BEFORE = [62, 55, 58];
const START: Score[] = [
  { n: "3", neg: true },
  { n: "4", neg: false },
  { n: "", neg: false },
];

interface Score {
  n: string;
  neg: boolean;
}
const points = (s: Score) => (s.n ? Number(s.n) * (s.neg ? -1 : 1) : 0);

type Cell = (s: Score, set: (s: Score) => void, i: number) => React.ReactNode;

/** The last rows of a sheet: one filled row, hummingbirds, and the total. */
const Sheet = ({ cell, tall = false }: { cell: Cell; tall?: boolean }) => {
  const [scores, setScores] = useState(START);
  const set = (i: number) => (s: Score) =>
    setScores(all => all.map((x, k) => (k === i ? s : x)));
  return (
    <div className="mk-sheet">
      <table className="mk-table">
        <thead>
          <tr>
            <th />
            {PLAYERS.map(p => (
              <th key={p} className="hand-caps">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="hand-caps">Tucked cards</th>
            <td>7</td>
            <td>11</td>
            <td>9</td>
          </tr>
          <tr className={tall ? "mk-hb" : undefined}>
            <th className="hand-caps">Hummingbirds</th>
            {scores.map((s, i) => (
              <td key={i}>{cell(s, set(i), i)}</td>
            ))}
          </tr>
          <tr className="mk-total">
            <th className="hand-caps">Total</th>
            {scores.map((s, i) => (
              <td key={i}>{BEFORE[i] + points(s)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/** The number itself: plain digits on the usual number pad. */
const Digits = ({ s, set, i }: { s: Score; set: (s: Score) => void; i: number }) => (
  <input
    inputMode="numeric"
    value={s.n}
    className={s.neg && s.n ? "mk-neg" : undefined}
    aria-label={`Hummingbirds, ${PLAYERS[i]}`}
    onChange={e => /^\d{0,3}$/.test(e.target.value) && set({ ...s, n: e.target.value })}
  />
);

const signLabel = (s: Score, i: number) =>
  `${PLAYERS[i]}'s hummingbird points are ${s.neg ? "negative" : "positive"}. Switch`;

const NUMBER_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

const Pad = () => (
  <div className="mk-keys mk-pad" aria-hidden="true">
    {NUMBER_PAD.map((row, r) => (
      <div key={r}>
        {row.map((k, i) => (
          <span key={i}>{k}</span>
        ))}
      </div>
    ))}
  </div>
);

const OPTIONS: { title: string; note: string; tall?: boolean; cell: Cell }[] = [
  {
    title: "A · The sign, written in the box",
    note: "Each box starts with a faint +. Tap it and it becomes a red −, and the number turns red with it. It reads like a sign written on the sheet rather than a button, and it's always there, so nothing pops up while typing.",
    cell: (s, set, i) => (
      <div className="mk-inline">
        <button
          type="button"
          className={`mk-sign${s.neg ? " is-neg" : ""}`}
          aria-label={signLabel(s, i)}
          onClick={() => set({ ...s, neg: !s.neg })}
        >
          {s.neg ? "−" : "+"}
        </button>
        <Digits s={s} set={set} i={i} />
      </div>
    ),
  },
  {
    title: "B · A little + / − switch",
    note: "A tiny two-sided switch sits under the number; the side that's on is filled in, red for minus. The clearest that it's a choice between two, but the row is a bit taller.",
    tall: true,
    cell: (s, set, i) => (
      <div className="mk-stack">
        <Digits s={s} set={set} i={i} />
        <button
          type="button"
          className="mk-switch"
          aria-label={signLabel(s, i)}
          onClick={() => set({ ...s, neg: !s.neg })}
        >
          <span className={s.neg ? undefined : "is-on"}>+</span>
          <span className={`mk-minus${s.neg ? " is-on" : ""}`}>−</span>
        </button>
      </div>
    ),
  },
  {
    title: "C · A sign tab on the box's edge",
    note: "A narrow strip down the left of each box holds the sign. Tap it to switch: it turns solid red for minus, so negative scores stand out down the row at a glance.",
    cell: (s, set, i) => (
      <div className="mk-tabbed">
        <button
          type="button"
          className={`mk-tab${s.neg ? " is-neg" : ""}`}
          aria-label={signLabel(s, i)}
          onClick={() => set({ ...s, neg: !s.neg })}
        >
          {s.neg ? "−" : "+"}
        </button>
        <Digits s={s} set={set} i={i} />
      </div>
    ),
  },
];

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Hummingbird boxes back on the usual number pad, with a sign you tap
        to switch between plus and minus. Jordan&apos;s box starts negative.
        Everything works: tap the signs and type in the boxes.
      </p>
      {OPTIONS.map(o => (
        <section key={o.title} className="mk-option">
          <h2 className="hand-caps">{o.title}</h2>
          <p className="mk-note">{o.note}</p>
          <div className="mk-phone">
            <Sheet cell={o.cell} tall={o.tall} />
            <Pad />
          </div>
        </section>
      ))}
    </main>
  );
}
