"use client";
// Temporary: three ways to show that End game saved the game.
import { useState } from "react";
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type Style = "tear" | "stamp" | "quiet" | "soft" | "mark";
type SheetState = "finished" | "clearing" | "fresh";

const CODES = ["JOR", "SAM", "ALX"];
const ROWS: [string, string[]][] = [
  ["Eggs", ["12", "9", "14"]],
  ["Food on cards", ["4", "6", "2"]],
  ["Tucked cards", ["7", "11", "5"]],
];
const TOTALS = ["89", "83", "70"];

/** The bottom of a score sheet: last rows and totals. */
const SheetEnd = ({ state }: { state: SheetState }) => {
  const show = (v: string, leader = false) =>
    state === "fresh" ? null : (
      <span className={state === "clearing" ? "mk-clear" : undefined}>
        {leader ? <span className="leader">{v}</span> : v}
      </span>
    );
  return (
    <div className="mk-sheet">
      <table className="mk-table">
        <thead>
          <tr>
            <th />
            {CODES.map(c => (
              <th key={c} className="hand-caps">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, vals]) => (
            <tr key={label}>
              <th className="hand-caps">{label}</th>
              {vals.map((v, i) => (
                <td key={i}>{show(v)}</td>
              ))}
            </tr>
          ))}
          <tr className="mk-total">
            <th className="hand-caps">Total</th>
            {TOTALS.map((t, i) => (
              <td key={i}>{show(t, i === 0)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const Slip = ({ className = "" }: { className?: string }) => (
  <div className={`past-slip ${className}`}>
    <header className="hand-caps">
      <span>Wednesday, Oct 28</span>
      <span className="past-muted">Base game</span>
    </header>
    <div className="past-scores">
      {CODES.map((c, i) => (
        <div key={c}>
          <span className="hand-caps">{c}</span>
          <span className="past-total">
            {i === 0 ? <span className="leader">{TOTALS[i]}</span> : TOTALS[i]}
          </span>
        </div>
      ))}
    </div>
  </div>
);

/** Timings per style: when the note shows and the count bumps. */
const TIMING: Record<Style, React.CSSProperties> = {
  tear: { "--note-delay": "0.55s", "--bump-delay": "0.75s" } as React.CSSProperties,
  stamp: {
    "--clear-delay": "0.5s",
    "--note-delay": "0.85s",
    "--bump-delay": "0.85s",
  } as React.CSSProperties,
  soft: {
    "--clear-delay": "0.2s",
    "--note-delay": "0.6s",
    "--bump-delay": "0.55s",
  } as React.CSSProperties,
  mark: {
    "--clear-delay": "0s",
    "--note-delay": "0.3s",
    "--bump-delay": "0.25s",
  } as React.CSSProperties,
  quiet: {
    "--clear-delay": "0s",
    "--note-delay": "0.3s",
    "--bump-delay": "0.25s",
  } as React.CSSProperties,
};

/** A phone you can press End game on, as many times as you like. */
const Demo = ({ style }: { style: Style }) => {
  const [ended, setEnded] = useState(false);
  // A new key replays the animation from the start.
  const [run, setRun] = useState(0);
  const end = () => {
    setEnded(true);
    setRun(r => r + 1);
  };
  const sheet: SheetState = !ended
    ? "finished"
    : style === "tear"
      ? "fresh"
      : "clearing";

  return (
    <figure className="mk-fig">
      <div className="mk-phone" style={TIMING[style]} key={run}>
        <div className={ended && style === "stamp" ? "mk-thud" : undefined}>
          <SheetEnd state={sheet} />
        </div>
        {ended ? (
          <p className="last-game hand-caps mk-note-in">
            {style === "mark" ? (
              <span className="mk-mark">Saved</span>
            ) : (
              "✓ "
            )}
            Last game:{" "}
            <button type="button" className="text-link">
              Jordan won with 89
            </button>{" "}
            ·{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => setEnded(false)}
            >
              Undo
            </button>
          </p>
        ) : (
          <p className="sheet-result mk-result">Jordan won with 89</p>
        )}
        <div className="sheet-actions hand-caps">
          <button
            type="button"
            className="ink-button ink-button-primary"
            onClick={end}
            disabled={ended}
          >
            End game
          </button>
          <button type="button" className="text-link history-link">
            Past games ·{" "}
            <span className={ended ? "mk-bump" : undefined}>
              {ended ? 4 : 3}
            </span>
          </button>
        </div>
        {ended && style === "tear" && <Slip className="mk-flying" />}
        {ended && style === "stamp" && (
          <div className="mk-stamp hand-caps">Saved</div>
        )}
        {ended && style === "soft" && (
          <div className="mk-stamp mk-stamp-soft hand-caps">Saved</div>
        )}
      </div>
      <figcaption className="hand-caps">
        {ended ? (
          <button type="button" className="text-link mk-replay" onClick={end}>
            Play it again ↻
          </button>
        ) : (
          "Press End game"
        )}
      </figcaption>
    </figure>
  );
};

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        What you see the moment you press End game. Each phone works: press
        End game to watch it, Undo to put the scores back, and Play it again
        to repeat. With reduce motion turned on, they all just show the note.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · The slip tears off</h2>
        <p className="mk-note">
          The result lifts off the sheet as a little Past games slip, tilts,
          and drops into the Past games link, which counts up. The sheet
          underneath is already fresh. Under a second.
        </p>
        <Demo style="tear" />
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · Stamped Saved</h2>
        <p className="mk-note">
          A Saved stamp thuds onto the finished sheet, then the scores lift
          off and the count goes up. A touch over a second; the most obvious
          that it was saved.
        </p>
        <Demo style="stamp" />
      </section>

      <h2 className="hand-caps mk-round">Between B and C</h2>

      <section className="mk-option">
        <h2 className="hand-caps">D · A soft stamp</h2>
        <p className="mk-note">
          The Saved stamp settles gently onto the sheet, with no thud or bounce,
          and fades as the scores lift off underneath it. About 0.9 seconds.
        </p>
        <Demo style="soft" />
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">E · Saved, in the note</h2>
        <p className="mk-note">
          C&apos;s quiet clearing, with a small Saved stamp inked into the
          last-game note. The stamp stays there until the next game starts.
          About half a second.
        </p>
        <Demo style="mark" />
      </section>

      <h2 className="hand-caps mk-round">For comparison</h2>

      <section className="mk-option">
        <h2 className="hand-caps">C · Quiet</h2>
        <p className="mk-note">
          No extra pieces: the scores lift off row by row, the Past games
          count bumps and the note fades in. About half a second.
        </p>
        <Demo style="quiet" />
      </section>
    </main>
  );
}
