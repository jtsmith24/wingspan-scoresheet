// Temporary: auto-save, and what replaces the Save button.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type State = "finished" | "unfinished";

const ROWS: [string, (string | null)[]][] = [
  ["Eggs", ["12", "9", "14"]],
  ["Food on cards", ["4", "6", "2"]],
  ["Tucked cards", ["7", "11", null]],
];

/** The bottom of a score sheet: last rows, totals, the result line. */
const SheetEnd = ({ state }: { state: State }) => (
  <div className="mk-sheet">
    <table className="mk-table">
      <thead>
        <tr>
          <th />
          {["JOR", "SAM", "ALX"].map(c => (
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
              <td key={i}>{v ?? (state === "finished" ? ["7", "11", "5"][i] : "")}</td>
            ))}
          </tr>
        ))}
        <tr className="mk-total">
          <th className="hand-caps">Total</th>
          <td>{state === "finished" ? <span className="leader">89</span> : "89"}</td>
          <td>83</td>
          <td>{state === "finished" ? "70" : "65"}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const Result = ({ state }: { state: State }) =>
  state === "finished" ? (
    <p className="sheet-result mk-result">Jordan won with 89</p>
  ) : (
    <p className="sheet-result sheet-pending mk-result">1 box left to fill</p>
  );

const Past = ({ n }: { n: number }) => (
  <button className="text-link history-link">Past games · {n}</button>
);

const Phone = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <figure className="mk-fig">
    <div className="mk-phone">{children}</div>
    <figcaption className="hand-caps">{label}</figcaption>
  </figure>
);

/** A dialog as it appears over the dimmed sheet. */
const Dialog = ({
  step,
  message,
  left,
  right,
}: {
  step?: string;
  message: string;
  left: string;
  right: string;
}) => (
  <div className="mk-phone mk-dim">
    <div className="app-dialog-card mk-dialog">
      {step && <p className="app-dialog-step hand-caps">{step}</p>}
      <p className="app-dialog-message">{message}</p>
      <div className="app-dialog-actions is-pair hand-caps">
        <button className="ink-button">{left}</button>
        <button className="ink-button ink-button-primary">{right}</button>
      </div>
      <div className="app-dialog-under hand-caps">
        <button className="text-link">Cancel</button>
      </div>
    </div>
  </div>
);

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Finished games save themselves. The question is how the sheet shows
        that, and where &ldquo;Save unfinished&rdquo; lives while a game is
        part-filled. Each option shows a finished sheet, then one with a box
        still empty.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · A quiet line under the result</h2>
        <p className="mk-note">
          The Save button is gone. A finished game says so in small print under
          the winner. Part-way through, &ldquo;Save unfinished&rdquo; is a
          plain link beside New game.
        </p>
        <div className="mk-pair">
          <Phone label="Finished">
            <SheetEnd state="finished" />
            <Result state="finished" />
            <p className="mk-saved hand-caps">✓ Saved to Past games</p>
            <div className="sheet-actions hand-caps">
              <button className="ink-button ink-button-primary">New game</button>
              <Past n={4} />
            </div>
          </Phone>
          <Phone label="Part-filled">
            <SheetEnd state="unfinished" />
            <Result state="unfinished" />
            <div className="sheet-actions hand-caps">
              <button className="ink-button ink-button-primary">New game</button>
              <button className="text-link history-link">Save unfinished</button>
              <Past n={3} />
            </div>
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · Stamped on the sheet</h2>
        <p className="mk-note">
          When the last box is filled, a &ldquo;Saved&rdquo; ink stamp lands
          on the sheet&apos;s corner, like a scorepad page that&apos;s done.
          Part-way through, &ldquo;Save unfinished&rdquo; is a regular button.
        </p>
        <div className="mk-pair">
          <Phone label="Finished">
            <div className="mk-stamped">
              <SheetEnd state="finished" />
              <span className="mk-stamp hand-caps">Saved</span>
            </div>
            <Result state="finished" />
            <div className="sheet-actions hand-caps">
              <button className="ink-button ink-button-primary">New game</button>
              <Past n={4} />
            </div>
          </Phone>
          <Phone label="Part-filled">
            <SheetEnd state="unfinished" />
            <Result state="unfinished" />
            <div className="sheet-actions hand-caps">
              <button className="ink-button">Save unfinished</button>
              <button className="ink-button ink-button-primary">New game</button>
              <Past n={3} />
            </div>
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · The Save button becomes a status</h2>
        <p className="mk-note">
          Closest to today: the first button stays where it is. Finished, it
          reads &ldquo;✓ Saved&rdquo; and can&apos;t be pressed. Part-way
          through, it reads &ldquo;Save unfinished&rdquo;.
        </p>
        <div className="mk-pair">
          <Phone label="Finished">
            <SheetEnd state="finished" />
            <Result state="finished" />
            <div className="sheet-actions hand-caps">
              <span className="ink-button mk-status">✓ Saved</span>
              <button className="ink-button ink-button-primary">New game</button>
              <Past n={4} />
            </div>
          </Phone>
          <Phone label="Part-filled">
            <SheetEnd state="unfinished" />
            <Result state="unfinished" />
            <div className="sheet-actions hand-caps">
              <button className="ink-button">Save unfinished</button>
              <button className="ink-button ink-button-primary">New game</button>
              <Past n={3} />
            </div>
          </Phone>
        </div>
      </section>

      <h2 className="hand-caps mk-round">The questions that change</h2>

      <section className="mk-option">
        <h2 className="hand-caps">New game</h2>
        <p className="mk-note">
          Finished: already saved, so only who&apos;s playing. Part-filled:
          keep it as unfinished or toss it first, then who&apos;s playing.
        </p>
        <div className="mk-pair">
          <figure className="mk-fig">
            <Dialog message="New game. Who's playing?" left="New players" right="Same players" />
            <figcaption className="hand-caps">Finished game</figcaption>
          </figure>
          <figure className="mk-fig">
            <Dialog
              step="1 of 2"
              message="This game isn't finished. Keep it as unfinished?"
              left="Toss it"
              right="Keep it"
            />
            <figcaption className="hand-caps">Part-filled game</figcaption>
          </figure>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">Changing expansions on a saved game</h2>
        <p className="mk-note">
          Ticking Oceania after a base game is saved. Usually that means
          setting up the next game; sometimes it&apos;s fixing this one.
        </p>
        <Dialog
          message="This game is saved. Start a new game with Oceania, or change this one?"
          left="Change this game"
          right="New game"
        />
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">Past games: pick an unfinished game back up</h2>
        <p className="mk-note">
          Unfinished slips say so in the corner. Opened, they offer
          &ldquo;Continue this game&rdquo;, which puts the sheet back exactly
          as it was.
        </p>
        <div className="mk-pair">
          <div className="mk-phone mk-drawer">
            <div className="past-head hand-caps">
              <h2>Past games</h2>
              <span className="past-close">Close ✕</span>
            </div>
            <div className="past-slip mk-tilt-a">
              <header className="hand-caps">
                <span>Sunday, Oct 25</span>
                <span className="mk-head-end">
                  <span className="mk-tag">Unfinished</span>
                  <span className="past-muted">▾</span>
                </span>
              </header>
              <div className="past-scores">
                {[["JOR", "64"], ["SAM", "58"], ["ALX", "61"]].map(([c, t]) => (
                  <div key={c}>
                    <span className="hand-caps">{c}</span>
                    <span className="past-total">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="past-slip mk-tilt-b">
              <header className="hand-caps">
                <span>Friday, Oct 23</span>
                <span className="mk-head-end">
                  <span className="past-muted">Base game</span>
                  <span className="past-muted">▾</span>
                </span>
              </header>
              <div className="past-scores">
                {[["JOR", "89"], ["SAM", "83"], ["ALX", "70"]].map(([c, t], i) => (
                  <div key={c}>
                    <span className="hand-caps">{c}</span>
                    <span className="past-total">
                      {i === 0 ? <span className="leader">{t}</span> : t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mk-phone mk-drawer">
            <div className="past-head hand-caps">
              <h2>Past games</h2>
              <span className="past-close">Close ✕</span>
            </div>
            <div className="past-slip">
              <header className="hand-caps">
                <span>Sunday, Oct 25</span>
                <span className="mk-head-end">
                  <span className="mk-tag">Unfinished</span>
                  <span className="past-muted">▴</span>
                </span>
              </header>
              <SheetEnd state="unfinished" />
              <p className="sheet-result mk-result">Unfinished game</p>
              <div className="mk-slip-actions hand-caps">
                <button className="ink-button ink-button-primary">Continue this game</button>
                <div className="mk-slip-links">
                  <button className="text-link">Play again with these players</button>
                  <button className="text-link past-muted">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
