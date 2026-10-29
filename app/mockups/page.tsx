"use client";
// Temporary: three ways to enter negative hummingbird points on a phone.
import { useState } from "react";
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

const PLAYERS = ["JOR", "SAM"];
const BEFORE = [62, 55];

const num = (v: string) => (/^-?\d+$/.test(v) ? Number(v) : 0);

type Pair = [string, string];
const update = (vals: Pair, i: number, v: string): Pair =>
  i === 0 ? [v, vals[1]] : [vals[0], v];

/** The last rows of a sheet: one filled row, hummingbirds, and the total. */
const Sheet = ({
  cell,
  total,
  tall = false,
}: {
  cell: (col: number) => React.ReactNode;
  total: (col: number) => number;
  tall?: boolean;
}) => (
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
        </tr>
        <tr className={tall ? "mk-hb" : undefined}>
          <th className="hand-caps">Hummingbirds</th>
          {PLAYERS.map((_, i) => (
            <td key={i}>{cell(i)}</td>
          ))}
        </tr>
        <tr className="mk-total">
          <th className="hand-caps">Total</th>
          {PLAYERS.map((_, i) => (
            <td key={i}>{BEFORE[i] + total(i)}</td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const Keys = ({ rows, className }: { rows: string[][]; className: string }) => (
  <div className={`mk-keys ${className}`} aria-hidden="true">
    {rows.map((row, r) => (
      <div key={r}>
        {row.map((k, i) => (
          <span key={i} className={k === "−" ? "mk-hot" : undefined}>
            {k}
          </span>
        ))}
      </div>
    ))}
  </div>
);

const NUMBER_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

const SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["−", "/", ":", ";", "(", ")", "$", "&", "@", "”"],
  [".", ",", "?", "!", "’", "#", "%", "+", "=", "⌫"],
];

const Stepper = () => {
  const [vals, setVals] = useState<Pair>(["", ""]);
  const set = (i: number, v: string) => setVals(vs => update(vs, i, v));
  return (
    <Sheet
      total={i => num(vals[i])}
      cell={i => (
        <div className="mk-stepper">
          <button
            type="button"
            className="mk-step"
            aria-label="One less"
            onClick={() => set(i, String(num(vals[i]) - 1))}
          >
            −
          </button>
          <input
            inputMode="numeric"
            value={vals[i]}
            aria-label={`Hummingbirds, ${PLAYERS[i]}`}
            onChange={e =>
              /^-?\d{0,3}$/.test(e.target.value) && set(i, e.target.value)
            }
          />
          <button
            type="button"
            className="mk-step"
            aria-label="One more"
            onClick={() => set(i, String(num(vals[i]) + 1))}
          >
            +
          </button>
        </div>
      )}
    />
  );
};

const Native = () => {
  const [vals, setVals] = useState<Pair>(["", ""]);
  return (
    <Sheet
      total={i => num(vals[i])}
      cell={i => (
        <input
          value={vals[i]}
          aria-label={`Hummingbirds, ${PLAYERS[i]}`}
          onChange={e =>
            /^-?\d{0,3}$/.test(e.target.value) &&
            setVals(vs => update(vs, i, e.target.value))
          }
        />
      )}
    />
  );
};

const Split = () => {
  const [gain, setGain] = useState<Pair>(["", ""]);
  const [loss, setLoss] = useState<Pair>(["", ""]);
  const box = (
    vals: Pair,
    set: typeof setGain,
    i: number,
    sign: string,
    label: string
  ) => (
    <label>
      {sign}
      <input
        inputMode="numeric"
        value={vals[i]}
        aria-label={`Hummingbird ${label}, ${PLAYERS[i]}`}
        onChange={e =>
          /^\d{0,3}$/.test(e.target.value) &&
          set(vs => update(vs, i, e.target.value))
        }
      />
    </label>
  );
  return (
    <Sheet
      tall
      total={i => num(gain[i]) - num(loss[i])}
      cell={i => (
        <div className="mk-split">
          {box(gain, setGain, i, "+", "points")}
          {box(loss, setLoss, i, "−", "lost")}
        </div>
      )}
    />
  );
};

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Hummingbird points can be negative, and a phone&apos;s plain number pad
        has no minus key. Three ways round it, none with a floating button.
        The boxes work: try typing in them.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · Count up or down</h2>
        <p className="mk-note">
          Faint − and + on either side of the box. Tap them to step the score
          past zero, or tap the box and type on the number pad as usual. The
          buttons take some width, so it gets tight with five players.
        </p>
        <div className="mk-phone">
          <Stepper />
          <Keys rows={NUMBER_PAD} className="mk-pad" />
        </div>
        <p className="mk-caption hand-caps">The usual number pad</p>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · The phone&apos;s own minus key</h2>
        <p className="mk-note">
          Nothing extra on the sheet. Just this row opens the keyboard&apos;s
          numbers-and-symbols page, which has a minus key (Android&apos;s
          number pad has one too). The keys are smaller than the number pad
          and sit in one long row.
        </p>
        <div className="mk-phone">
          <Native />
          <Keys rows={SYMBOLS} className="mk-sym" />
        </div>
        <p className="mk-caption hand-caps">iPhone: numbers and symbols</p>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · Points and points lost</h2>
        <p className="mk-note">
          The box splits in two: points gained on top, points lost underneath,
          both typed as plain numbers on the number pad. The total takes the
          lost points off. The row is a little taller.
        </p>
        <div className="mk-phone">
          <Split />
          <Keys rows={NUMBER_PAD} className="mk-pad" />
        </div>
        <p className="mk-caption hand-caps">The usual number pad</p>
      </section>
    </main>
  );
}
