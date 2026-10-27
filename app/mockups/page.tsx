// Temporary: one End game button that saves the game and clears the sheet.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type State = "finished" | "partial" | "fresh";

const CODES = ["JOR", "SAM", "ALX"];
const ROWS: [string, string[]][] = [
  ["Eggs", ["12", "9", "14"]],
  ["Food on cards", ["4", "6", "2"]],
  ["Tucked cards", ["7", "11", "5"]],
];

/** The bottom of a score sheet: last rows and totals. */
const SheetEnd = ({ state }: { state: State }) => (
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
              <td key={i}>
                {state === "fresh" || (state === "partial" && label === "Tucked cards" && i === 2) ? "" : v}
              </td>
            ))}
          </tr>
        ))}
        <tr className="mk-total">
          <th className="hand-caps">Total</th>
          {state === "fresh" ? (
            <>
              <td />
              <td />
              <td />
            </>
          ) : (
            <>
              <td>{state === "finished" ? <span className="leader">89</span> : "89"}</td>
              <td>83</td>
              <td>{state === "finished" ? "70" : "65"}</td>
            </>
          )}
        </tr>
      </tbody>
    </table>
  </div>
);

const Actions = ({ games, ended = false }: { games: number; ended?: boolean }) => (
  <div className="sheet-actions hand-caps">
    <button className="ink-button ink-button-primary" disabled={ended}>
      End game
    </button>
    <button className="text-link history-link">Past games · {games}</button>
  </div>
);

const Phone = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <figure className="mk-fig">
    <div className={`mk-phone ${className}`}>{children}</div>
    <figcaption className="hand-caps">{label}</figcaption>
  </figure>
);

const Before = () => (
  <Phone label="Every box filled">
    <SheetEnd state="finished" />
    <p className="sheet-result mk-result">Jordan won with 89</p>
    <Actions games={3} />
  </Phone>
);

const Slip = ({ className = "" }: { className?: string }) => (
  <div className={`past-slip ${className}`}>
    <header className="hand-caps">
      <span>Monday, Oct 26</span>
      <span className="past-muted">Base game</span>
    </header>
    <div className="past-scores">
      {[["JOR", "89"], ["SAM", "83"], ["ALX", "70"]].map(([c, t], i) => (
        <div key={c}>
          <span className="hand-caps">{c}</span>
          <span className="past-total">{i === 0 ? <span className="leader">{t}</span> : t}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        One button. End game saves the game to Past games and clears the
        sheet, keeping everyone&apos;s names for the next one. No Save, no
        Update, no New game. The question is what you see straight after.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · The result stays as a note</h2>
        <p className="mk-note">
          The sheet clears, and where the result usually sits it says who won
          the last game and that it&apos;s in Past games. The note goes once
          someone types a score.
        </p>
        <div className="mk-pair">
          <Before />
          <Phone label="Just ended">
            <SheetEnd state="fresh" />
            <p className="mk-ended hand-caps">✓ Last game: Jordan won with 89 · in Past games</p>
            <Actions games={4} ended />
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · The slip tears off</h2>
        <p className="mk-note">
          The result tears off as a little slip, stamped Saved, then drops
          into Past games and the count goes up. About two seconds; still on
          screen for anyone who&apos;d rather not watch it move.
        </p>
        <div className="mk-pair">
          <Before />
          <Phone label="Just ended">
            <SheetEnd state="fresh" />
            <Slip className="mk-tear" />
            <Actions games={4} ended />
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · Past games opens on it</h2>
        <p className="mk-note">
          Past games slides open with the new slip on top, marked Just now.
          Close it and the fresh sheet is waiting.
        </p>
        <div className="mk-pair">
          <Before />
          <Phone label="Just ended" className="mk-drawer">
            <div className="past-head hand-caps">
              <h2>Past games</h2>
              <span className="past-close">Close ✕</span>
            </div>
            <span className="mk-just hand-caps">Just now</span>
            <Slip className="mk-new" />
            <div className="past-slip">
              <header className="hand-caps">
                <span>Friday, Oct 23</span>
                <span className="past-muted">Oceania</span>
              </header>
              <div className="past-scores">
                {[["JOR", "77"], ["SAM", "81"]].map(([c, t], i) => (
                  <div key={c}>
                    <span className="hand-caps">{c}</span>
                    <span className="past-total">{i === 1 ? <span className="leader">{t}</span> : t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Phone>
        </div>
      </section>

      <h2 className="hand-caps mk-round">Ending early</h2>
      <section className="mk-option">
        <p className="mk-note">
          Boxes still empty: one question, so a stray tap mid-game can&apos;t
          clear the sheet. Ending saves it as an unfinished game.
        </p>
        <div className="mk-pair">
          <Phone label="One box empty">
            <SheetEnd state="partial" />
            <p className="sheet-result sheet-pending mk-result">1 box left to fill</p>
            <Actions games={3} />
          </Phone>
          <figure className="mk-fig">
            <div className="mk-phone mk-dim">
              <div className="app-dialog-card mk-dialog">
                <p className="app-dialog-message">1 box is still empty. End the game anyway?</p>
                <div className="app-dialog-actions is-pair hand-caps">
                  <button className="ink-button">Keep playing</button>
                  <button className="ink-button ink-button-primary">End game</button>
                </div>
              </div>
            </div>
            <figcaption className="hand-caps">Tapped End game</figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
