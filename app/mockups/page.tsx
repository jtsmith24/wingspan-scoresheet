// Temporary: saved-games and long-name mockups. Delete once chosen.
import "./mockups.css";
import { ScoreIcon, ScoreIconName } from "@/components/ScoreIcon";

const games = [
  { date: "Oct 24", day: "Friday", setup: "Base + Oceania", players: [["JOR", 89], ["SAM", 89], ["ALX", 70]], winner: 0, note: "Won on unused food 3 to 1" },
  { date: "Oct 19", day: "Sunday", setup: "Base + Americas", players: [["SAM", 94], ["JOR", 81]], winner: 0 },
  { date: "Oct 12", day: "Sunday", setup: "Asia · Duet", players: [["JOR", 102], ["SAM", 77]], winner: 0 },
  { date: "Oct 5", day: "Saturday", setup: "Base", players: [["ALX", 76], ["JOR", 72], ["SAM", 68], ["KIM", 61]], winner: 0 },
] as const;

const Circled = ({ children }: { children: React.ReactNode }) => (
  <span className="leader">{children}</span>
);

type SheetRow = { label: string; icon?: ScoreIconName; group: string; values: number[] };

// The Oct 24 game in full: totals 89 / 89 / 70, JOR wins on unused food.
const oct24: SheetRow[] = [
  { label: "Birds", icon: "bird", group: "Amount on cards", values: [34, 47, 23] },
  { label: "Bonus cards", icon: "bonus", group: "Amount on cards", values: [6, 7, 3] },
  { label: "End-of-round goals", icon: "goal", group: "Amount on cards", values: [13, 9, 15] },
  { label: "Eggs", icon: "egg", group: "1 point each", values: [16, 5, 11] },
  { label: "Food on cards", icon: "food", group: "1 point each", values: [2, 8, 4] },
  { label: "Tucked cards", icon: "tucked", group: "1 point each", values: [12, 3, 9] },
  { label: "Nectar", icon: "forest", group: "Majority", values: [6, 10, 5] },
];

const longNames = ["Jordan", "Samantha", "Alexander", "Kim", "Christopher"];
const shortRows: SheetRow[] = [
  { label: "Birds", icon: "bird", group: "Amount on cards", values: [34, 41, 28, 22, 30] },
  { label: "Bonus cards", icon: "bonus", group: "Amount on cards", values: [6, 7, 3, 9, 4] },
  { label: "Eggs", icon: "egg", group: "1 point each", values: [16, 5, 11, 14, 8] },
];

/** A read-only copy of the score sheet table. */
const StaticSheet = ({
  title,
  names,
  rows,
  winner,
  extra,
}: {
  title: string;
  names: readonly string[];
  rows: SheetRow[];
  winner: number;
  extra?: React.ReactNode;
}) => {
  const totals = names.map((_, i) => rows.reduce((sum, r) => sum + r.values[i], 0));
  return (
    <div className="sheet-scroll">
      <table id="sum-table" style={{ minWidth: `calc(9rem + ${names.length * 3}rem)` }}>
        <colgroup>
          <col className="group-col" />
          <col className="label-col" />
          {names.map(n => <col key={n} />)}
        </colgroup>
        <thead>
          <tr>
            <th colSpan={2} className="sheet-title hand-caps">{title}</th>
            {names.map(n => (
              <th key={n} className="player-cell">
                <span className="mock-player-box"><span className="mock-player" style={{ "--chars": n.length } as React.CSSProperties}>{n}</span></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const starts = i === 0 || rows[i - 1].group !== r.group;
            return (
              <tr key={r.label} className={starts ? "group-start" : ""}>
                {starts && (
                  <th rowSpan={rows.filter(x => x.group === r.group).length} className="group-label hand-caps">
                    <span>{r.group}</span>
                  </th>
                )}
                <th className="row-label hand-caps">
                  {r.icon && <ScoreIcon name={r.icon} />}
                  <span>{r.label}</span>
                </th>
                {r.values.map((v, j) => <td key={j} className="mock-cell">{v}</td>)}
              </tr>
            );
          })}
          <tr className="total-row">
            <th colSpan={2} className="hand-caps">Total</th>
            {totals.map((t, j) => (
              <td key={j}>{j === winner ? <Circled>{t}</Circled> : t}</td>
            ))}
          </tr>
          {extra}
        </tbody>
      </table>
    </div>
  );
};

export default function Mockups() {
  return (
    <main className="mockups">
      <nav className="mock-jump hand-caps">
        <a href="#a">Saved games</a>
        <a href="#names">Long names</a>
      </nav>
      {/* A — torn-off sheets in a side drawer */}
      <section id="a" className="mock">
        <h2 className="mock-title hand-caps">A · Torn-off sheets</h2>
        <div className="mock-a">
          <div className="mock-a-dim" />
          <aside className="mock-a-drawer">
            <div className="mock-a-head">
              <span className="hand-caps">Past games</span>
              <span className="hand-caps mock-close">Close ✕</span>
            </div>
            {games.map((g, i) => (
              <article key={i} className="mock-a-slip" style={{ rotate: `${[-0.6, 0.5, -0.3, 0.7][i]}deg` }}>
                <header className="hand-caps">
                  <span>{g.day}, {g.date}</span>
                  <span className="mock-muted">{g.setup}</span>
                </header>
                <div className="mock-a-scores">
                  {g.players.map(([name, total], j) => (
                    <div key={j}>
                      <span className="mock-name">{name}</span>
                      <span className="mock-pen">{j === g.winner ? <Circled>{total}</Circled> : total}</span>
                    </div>
                  ))}
                </div>
                {"note" in g && <p className="mock-note">{g.note}</p>}
              </article>
            ))}
          </aside>
        </div>
      </section>

      {/* A, tapped open — the slip unfolds into the full sheet */}
      <section id="a-open" className="mock">
        <h2 className="mock-title hand-caps">A · Tapped open</h2>
        <div className="mock-a mock-a-open">
          <div className="mock-a-dim" />
          <aside className="mock-a-drawer">
            <div className="mock-a-head">
              <span className="hand-caps mock-back">← Past games</span>
              <span className="hand-caps mock-close">Close ✕</span>
            </div>
            <article className="mock-a-full">
              <header className="hand-caps">
                <span>Friday, Oct 24</span>
                <span className="mock-muted">Base + Oceania</span>
              </header>
              <StaticSheet
                title="Multiplayer"
                names={["JOR", "SAM", "ALX"]}
                rows={oct24}
                winner={0}
                extra={
                  <tr className="tiebreak-row">
                    <th colSpan={2} className="row-label hand-caps">
                      <ScoreIcon name="food" />
                      <span>Unused food</span>
                    </th>
                    <td className="mock-cell">3</td>
                    <td className="mock-cell">1</td>
                    <td className="mock-cell mock-muted">–</td>
                  </tr>
                }
              />
              <p className="sheet-result">JOR won on unused food, 3 to 1</p>
              <div className="mock-a-actions hand-caps">
                <span>Play again with these players</span>
                <span className="mock-muted">Delete</span>
              </div>
            </article>
          </aside>
        </div>
      </section>

      {/* B — a ruled logbook page under the sheet */}
      <section id="b" className="mock">
        <h2 className="mock-title hand-caps">B · Logbook page</h2>
        <div className="mock-b score-sheet">
          <div className="mock-b-title">
            <span className="wordmark">LOGBOOK</span>
            <span className="hand-caps mock-muted">4 games · JOR leads with 2 wins</span>
          </div>
          <table className="mock-b-table">
            <thead className="hand-caps">
              <tr><th>Date</th><th>Played</th><th>Scores</th><th>Winner</th></tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={i}>
                  <td className="hand-caps">{g.date}</td>
                  <td className="hand-caps mock-muted">{g.setup}</td>
                  <td className="mock-pen">{g.players.map(([n, t]) => `${n} ${t}`).join(" · ")}</td>
                  <td className="mock-pen"><Circled>{g.players[g.winner][0]}</Circled></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C — each game as a card, like the bird cards */}
      <section id="c" className="mock">
        <h2 className="mock-title hand-caps">C · Game cards</h2>
        <div className="mock-c">
          {games.map((g, i) => (
            <article key={i} className={`mock-c-card mock-c-${["oceania", "americas", "asia", "base"][i]}`}>
              <div className="mock-c-name">
                <span className="hand-caps">{g.players[g.winner][0]} won</span>
                <em>{g.day}, {g.date}</em>
              </div>
              <div className="mock-c-big mock-pen">{g.players[g.winner][1]}</div>
              <ul>
                {g.players.map(([n, t], j) => (
                  <li key={j} className={j === g.winner ? "is-winner" : ""}>
                    <span className="hand-caps">{n}</span>
                    <span className="mock-pen">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mock-c-banner hand-caps">{g.setup}{"note" in g ? ` — ${g.note}` : ""}</div>
            </article>
          ))}
        </div>
      </section>

      {/* Long names — three ways to fit them in the header */}
      <section id="names" className="mock">
        <h2 className="mock-title hand-caps">Long names</h2>
        <p className="mock-intro">
          Five players, up to 12 letters each. Columns stay the same width in all three, so the sheet still fits a phone.
        </p>
        {[
          { id: "fit", title: "1 · Shrink to fit", note: "Each name stays on one line and gets smaller the longer it is. Short names look just like today." },
          { id: "wrap", title: "2 · Wrap", note: "Names keep one size and break onto a second line when needed. The header row grows a little." },
          { id: "rotate", title: "3 · Written up the column", note: "Names run upward like the group labels on the printed pad. Every name is the same size; the header is taller." },
        ].map(o => (
          <div key={o.id} className={`mock-names names-${o.id}`}>
            <h3 className="hand-caps">{o.title}</h3>
            <p className="mock-intro">{o.note}</p>
            <div className="score-sheet">
              <StaticSheet title="Multiplayer" names={longNames} rows={shortRows} winner={0} />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
