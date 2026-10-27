// Temporary: what the buttons do after a game is saved.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type State = "playing" | "saved" | "edited";

const ROWS: [string, string[]][] = [
  ["Eggs", ["12", "9", "14"]],
  ["Food on cards", ["4", "6", "2"]],
  ["Tucked cards", ["7", "11", "5"]],
];

/** The bottom of a score sheet: last rows, totals, the result line. */
const SheetEnd = ({ state }: { state: State }) => (
  <>
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
                <td key={i}>{state === "edited" && label === "Eggs" && i === 1 ? "10" : v}</td>
              ))}
            </tr>
          ))}
          <tr className="mk-total">
            <th className="hand-caps">Total</th>
            <td>
              <span className="leader">89</span>
            </td>
            <td>{state === "edited" ? "84" : "83"}</td>
            <td>70</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="sheet-result mk-result">Jordan won with 89</p>
  </>
);

const Past = ({ state }: { state: State }) => (
  <button className="text-link history-link">
    Past games · {state === "playing" ? 3 : 4}
  </button>
);

const Phone = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <figure className="mk-fig">
    <div className="mk-phone">{children}</div>
    <figcaption className="hand-caps">{label}</figcaption>
  </figure>
);

const LABELS: Record<State, string> = {
  playing: "Before saving",
  saved: "Just saved",
  edited: "Fixed a typo after",
};

/** Before saving and after a typo fix look the same in every option. */
const Usual = ({ state }: { state: "playing" | "edited" }) => (
  <div className="sheet-actions hand-caps">
    <button className="ink-button ink-button-primary">
      {state === "playing" ? "Save game" : "Update saved game"}
    </button>
    <button className="ink-button">New game</button>
    <Past state={state} />
  </div>
);

const Option = ({
  title,
  note,
  saved,
}: {
  title: string;
  note: string;
  saved: React.ReactNode;
}) => (
  <section className="mk-option">
    <h2 className="hand-caps">{title}</h2>
    <p className="mk-note">{note}</p>
    <div className="mk-pair">
      {(["playing", "saved", "edited"] as const).map(state => (
        <Phone key={state} label={LABELS[state]}>
          <SheetEnd state={state} />
          {state === "saved" ? saved : <Usual state={state} />}
        </Phone>
      ))}
    </div>
  </section>
);

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Saving keeps the sheet on screen so everyone can look at the result
        and fix a typo. Once it&apos;s saved, the next step is a new game, so
        New game becomes the main button. Edit anything and Save comes back
        as &ldquo;Update saved game&rdquo;.
      </p>

      <Option
        title="A · The buttons swap"
        note="Both buttons stay put. After saving, Save greys out to “Saved” and New game turns dark."
        saved={
          <div className="sheet-actions hand-caps">
            <button className="ink-button" disabled>
              Saved
            </button>
            <button className="ink-button ink-button-primary">New game</button>
            <Past state="saved" />
          </div>
        }
      />

      <Option
        title="B · Save steps aside"
        note="After saving, the Save button goes away and a small line under the result says it's saved. New game is the only button."
        saved={
          <>
            <p className="mk-saved hand-caps">✓ Saved to Past games</p>
            <div className="sheet-actions hand-caps">
              <button className="ink-button ink-button-primary">New game</button>
              <Past state="saved" />
            </div>
          </>
        }
      />

      <Option
        title="C · Saved sits by Past games"
        note="After saving, New game moves to the front and “✓ Saved” sits quietly beside Past games, where the game went."
        saved={
          <div className="sheet-actions hand-caps">
            <button className="ink-button ink-button-primary">New game</button>
            <span className="mk-saved-inline">✓ Saved</span>
            <Past state="saved" />
          </div>
        }
      />

      <h2 className="hand-caps mk-round">Changing expansions after saving</h2>
      <section className="mk-option">
        <p className="mk-note">
          Ticking Oceania after a base game is saved. Usually that means
          setting up the next game; sometimes it&apos;s fixing this one.
        </p>
        <div className="mk-phone mk-dim">
          <div className="app-dialog-card mk-dialog">
            <p className="app-dialog-message">
              This game is saved. Start a new game with Oceania, or change this one?
            </p>
            <div className="app-dialog-actions is-pair hand-caps">
              <button className="ink-button">Change this game</button>
              <button className="ink-button ink-button-primary">New game</button>
            </div>
            <div className="app-dialog-under hand-caps">
              <button className="text-link">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
