// Temporary: three takes on the "New game with unsaved scores" dialog.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

const Phone = ({ children }: { children: React.ReactNode }) => (
  <div className="mk-phone">
    <div className="mk-sheet" aria-hidden="true" />
    <div className="mk-dim" />
    <div className="mk-center">{children}</div>
  </div>
);

const Toggle = ({ left, right }: { left: string; right: string }) => (
  <div className="mk-toggle hand-caps" role="radiogroup">
    <span className="is-on">{left}</span>
    <span>{right}</span>
  </div>
);

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Starting a new game when the sheet has scores that aren&apos;t saved.
        All three avoid checkboxes and keep every tap target thumb-sized.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · Stacked choices</h2>
        <p className="mk-note">
          One big button per outcome, safest first. Who&apos;s playing is a
          two-way toggle above them. Familiar from phone action sheets.
        </p>
        <Phone>
          <div className="app-dialog-card mk-card">
            <p className="app-dialog-message">
              Start a new game? This one hasn&apos;t been saved yet.
            </p>
            <Toggle left="Same players" right="New players" />
            <div className="mk-stack hand-caps">
              <button className="ink-button ink-button-primary">
                Save &amp; start new
              </button>
              <button className="ink-button">Start new without saving</button>
              <button className="text-link mk-cancel">Cancel</button>
            </div>
          </div>
        </Phone>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · Tear it off</h2>
        <p className="mk-note">
          Leans on the pad: you see the sheet you&apos;re about to tear off,
          then keep it in Past games or toss it. Same toggle for players.
        </p>
        <Phone>
          <div className="app-dialog-card mk-card">
            <div className="mk-slip">
              <div className="mk-slip-head hand-caps">
                <span>Tonight</span>
                <span className="mk-muted">Base game</span>
              </div>
              <div className="mk-slip-scores">
                <span>
                  <b className="hand-caps">JOR</b>
                  <i className="leader">89</i>
                </span>
                <span>
                  <b className="hand-caps">SAM</b>
                  <i>83</i>
                </span>
                <span>
                  <b className="hand-caps">ALX</b>
                  <i>70</i>
                </span>
              </div>
            </div>
            <p className="app-dialog-message">Tear this sheet off?</p>
            <Toggle left="Same players" right="New players" />
            <div className="mk-row hand-caps">
              <button className="ink-button">Toss it</button>
              <button className="ink-button ink-button-primary">
                Keep in Past games
              </button>
            </div>
            <button className="text-link mk-cancel mk-cancel-center hand-caps">
              Cancel
            </button>
          </div>
        </Phone>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · Two quick taps</h2>
        <p className="mk-note">
          Two small questions, one after the other. Each is a single tap; the
          second only appears once the first is answered.
        </p>
        <div className="mk-pair">
          <Phone>
            <div className="app-dialog-card mk-card">
              <p className="mk-step hand-caps">1 of 2</p>
              <p className="app-dialog-message">
                This game hasn&apos;t been saved. Keep it?
              </p>
              <div className="mk-row hand-caps">
                <button className="ink-button">Toss it</button>
                <button className="ink-button ink-button-primary">
                  Save it
                </button>
              </div>
              <button className="text-link mk-cancel mk-cancel-center hand-caps">
                Cancel
              </button>
            </div>
          </Phone>
          <Phone>
            <div className="app-dialog-card mk-card">
              <p className="mk-step hand-caps">2 of 2</p>
              <p className="app-dialog-message">Who&apos;s playing next?</p>
              <div className="mk-row hand-caps">
                <button className="ink-button">New players</button>
                <button className="ink-button ink-button-primary">
                  Same players
                </button>
              </div>
            </div>
          </Phone>
        </div>
      </section>
    </main>
  );
}
