// Temporary: three directions for the saved-games view. Not for commit.
import "./mockups.css";

const games = [
  { date: "Oct 24", day: "Friday", setup: "Base + Oceania", players: [["JOR", 89], ["SAM", 89], ["ALX", 70]], winner: 0, note: "Won on unused food 3 to 1" },
  { date: "Oct 19", day: "Sunday", setup: "Base + Americas", players: [["SAM", 94], ["JOR", 81]], winner: 0 },
  { date: "Oct 12", day: "Sunday", setup: "Asia · Duet", players: [["JOR", 102], ["SAM", 77]], winner: 0 },
  { date: "Oct 5", day: "Saturday", setup: "Base", players: [["ALX", 76], ["JOR", 72], ["SAM", 68], ["KIM", 61]], winner: 0 },
] as const;

const Circled = ({ children }: { children: React.ReactNode }) => (
  <span className="leader">{children}</span>
);

export default function Mockups() {
  return (
    <main className="mockups">
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
    </main>
  );
}
