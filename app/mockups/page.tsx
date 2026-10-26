// Temporary: takes on choosing expansions with a single multi-select.
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type Box = "european" | "oceania" | "asia" | "americas";
const BOXES: { id: Box; label: string }[] = [
  { id: "european", label: "European" },
  { id: "oceania", label: "Oceania" },
  { id: "asia", label: "Asia" },
  { id: "americas", label: "Americas" },
];
const label = (id: Box) => BOXES.find(b => b.id === id)!.label;

/** Phone-width frame: the tab row, then the top of the score sheet. */
const Phone = ({
  tabs,
  children,
}: {
  tabs: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="mk-phone">
    <div className="mk-top hand-caps">{tabs}</div>
    <div className="mk-sheet" aria-hidden="true">
      {["Birds", "Bonus cards", "End-of-round", "Eggs"].map(r => (
        <span key={r} className="hand-caps">
          {r}
        </span>
      ))}
    </div>
    {children}
  </div>
);

const Tab = ({
  tone,
  on,
  children,
}: {
  tone: string;
  on?: boolean;
  children: React.ReactNode;
}) => (
  <div className={`expansion-tab tab-${tone}${on ? " is-on" : ""}`}>
    <button type="button">{children}</button>
  </div>
);

/** The checklist, shared by A and B. */
const Checklist = ({ on }: { on: Box[] }) => (
  <div className="mix-popover mk-pop">
    <p className="mix-hint">Which expansions are in the box?</p>
    {BOXES.map(b => (
      <label key={b.id} className="mix-option">
        <input type="checkbox" readOnly checked={on.includes(b.id)} />
        <span className={`mix-swatch tab-${b.id}`} />
        {b.label}
      </label>
    ))}
    <button type="button" className="text-link mix-clear">
      Done
    </button>
  </div>
);

const Toggle = ({ on, label }: { on: boolean; label: string }) => (
  <span className={`mk-pill hand-caps${on ? " is-on" : ""}`}>{label}</span>
);

/** A pill in the expansion's own colour: pale when off, full when on. */
const TonePill = ({
  id,
  on,
  children,
}: {
  id: Box;
  on: boolean;
  children: React.ReactNode;
}) => (
  <span className={`mk-tpill hand-caps tab-${id}${on ? " is-on" : ""}`}>
    {on && <span className="mk-tick">✓</span>}
    {children}
  </span>
);

export default function Mockups() {
  const picked: Box[] = ["european", "oceania"];
  return (
    <main className="mk">
      <p className="mk-intro">
        One place to pick expansions, ticking as many as are in the box. Each
        option shows the sheet as you&apos;d see it, then with the picker open.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · One Expansions tab</h2>
        <p className="mk-note">
          Two tabs only. The second names what&apos;s ticked; tap it for the
          checklist. With nothing ticked it just says Expansions.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="expansion-tabs mk-tabs">
                <Tab tone="base">Base</Tab>
                <Tab tone="european" on>
                  European + Oceania ▾
                </Tab>
              </div>
            }
          />
          <Phone
            tabs={
              <div className="expansion-tabs mk-tabs">
                <Tab tone="base">Base</Tab>
                <Tab tone="european" on>
                  European + Oceania ▴
                </Tab>
              </div>
            }
          >
            <Checklist on={picked} />
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · A tab per box in play</h2>
        <p className="mk-note">
          Base is always there; each ticked expansion gets its own coloured
          tab, and + Add opens the checklist. You see your table&apos;s boxes at a
          glance, and nothing you aren&apos;t using.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="expansion-tabs mk-tabs">
                <Tab tone="base" on>
                  Base
                </Tab>
                {picked.map(id => (
                  <Tab key={id} tone={id} on>
                    {label(id)}
                  </Tab>
                ))}
                <Tab tone="mix">+ Add</Tab>
              </div>
            }
          />
          <Phone
            tabs={
              <div className="expansion-tabs mk-tabs">
                <Tab tone="base" on>
                  Base
                </Tab>
                {picked.map(id => (
                  <Tab key={id} tone={id} on>
                    {label(id)}
                  </Tab>
                ))}
                <Tab tone="mix" on>
                  + Add
                </Tab>
              </div>
            }
          >
            <Checklist on={picked} />
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · Pills above the sheet</h2>
        <p className="mk-note">
          No tabs and no popup: every expansion is a pill you tap on or off,
          always in view. Nothing to open; the sheet sits right under them.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="mk-pills">
                <span className="mk-pills-label">Expansions</span>
                {BOXES.map(b => (
                  <Toggle key={b.id} on={picked.includes(b.id)} label={b.label} />
                ))}
              </div>
            }
          />
          <Phone
            tabs={
              <div className="mk-pills">
                <span className="mk-pills-label">Expansions</span>
                {BOXES.map(b => (
                  <Toggle
                    key={b.id}
                    on={b.id === "asia"}
                    label={b.id === "asia" ? "Asia · Duet ▾" : b.label}
                  />
                ))}
              </div>
            }
          />
        </div>
        <p className="mk-note mk-muted">
          Right: Asia on its own, with its mode inside the pill.
        </p>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">D · Pills in each expansion&apos;s colour</h2>
        <p className="mk-note">
          C, but every pill wears its box&apos;s colour: pale and outlined when
          off, solid with a tick when on. The colours match the tabs and
          swatches you know from the sheet.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="mk-pills">
                <span className="mk-pills-label">Expansions</span>
                {BOXES.map(b => (
                  <TonePill key={b.id} id={b.id} on={picked.includes(b.id)}>
                    {b.label}
                  </TonePill>
                ))}
              </div>
            }
          />
          <Phone
            tabs={
              <div className="mk-pills">
                <span className="mk-pills-label">Expansions</span>
                {BOXES.map(b => (
                  <TonePill key={b.id} id={b.id} on={b.id === "asia"}>
                    {b.id === "asia" ? "Asia · Duet ▾" : b.label}
                  </TonePill>
                ))}
              </div>
            }
          />
        </div>
        <p className="mk-note mk-muted">
          Left: European and Oceania mixed. Right: Asia on its own, in Duet
          mode.
        </p>
      </section>

      <h2 className="hand-caps mk-round">Round 2 · fresh ideas</h2>

      <section className="mk-option">
        <h2 className="hand-caps">E · Box spines</h2>
        <p className="mk-note">
          The expansions stand like game boxes on a shelf. Tap a spine to pull
          it out; pulled-out boxes are in play. Names run up the spine, so
          they&apos;re always full, at any width.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="mk-shelf">
                <span className="mk-spine tab-base is-on">Base</span>
                {BOXES.map(b => (
                  <span
                    key={b.id}
                    className={`mk-spine tab-${b.id}${picked.includes(b.id) ? " is-on" : ""}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            }
          />
          <Phone
            tabs={
              <div className="mk-shelf">
                <span className="mk-spine tab-base is-on">Base</span>
                {BOXES.map(b => (
                  <span
                    key={b.id}
                    className={`mk-spine tab-${b.id}${b.id === "asia" ? " is-on" : ""}`}
                  >
                    {b.label}
                    {b.id === "asia" && <small>Duet ▾</small>}
                  </span>
                ))}
              </div>
            }
          />
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">F · Written on the sheet</h2>
        <p className="mk-note">
          No tabs at all. The game is written across the top of the sheet,
          like you&apos;d jot it on a paper pad. Tap the line to change it.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <p className="mk-title-line">
                <span className="hand-caps">Playing</span>
                <span className="mk-written">
                  Base + European + Oceania
                </span>
                <span className="mk-pen">✎</span>
              </p>
            }
          />
          <Phone
            tabs={
              <p className="mk-title-line">
                <span className="hand-caps">Playing</span>
                <span className="mk-written">Base + European + Oceania</span>
                <span className="mk-pen">▴</span>
              </p>
            }
          >
            <Checklist on={picked} />
          </Phone>
        </div>
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">G · Ink stamps</h2>
        <p className="mk-note">
          Each expansion is a round stamp in its colour along the sheet&apos;s
          top edge. Tap to stamp it on (solid, slightly crooked, like real
          ink); tap again to lift it. Faint outlines show what you could add.
        </p>
        <div className="mk-pair">
          <Phone
            tabs={
              <div className="mk-stamps">
                {BOXES.map(b => (
                  <span
                    key={b.id}
                    className={`mk-stamp hand-caps tab-${b.id}${picked.includes(b.id) ? " is-on" : ""}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            }
          />
          <Phone
            tabs={
              <div className="mk-stamps">
                {BOXES.map(b => (
                  <span
                    key={b.id}
                    className={`mk-stamp hand-caps tab-${b.id}${b.id === "asia" ? " is-on" : ""}`}
                  >
                    {b.label}
                    {b.id === "asia" && <small>Duet ▾</small>}
                  </span>
                ))}
              </div>
            }
          />
        </div>
        <p className="mk-note mk-muted">
          Left: European and Oceania. Right: Asia alone, in Duet mode.
        </p>
      </section>
    </main>
  );
}
