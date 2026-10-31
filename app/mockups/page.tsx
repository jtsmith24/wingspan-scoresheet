"use client";
// Temporary: three ways to switch a solo game to playing against the Automa.
import { useState } from "react";
import "./mockups.css";
import "../../components/sum-table/styles/sum-table-styles.css";

type Difficulty = 3 | 4 | 5;
const DIFFICULTIES: [Difficulty, string][] = [
  [3, "Eaglet"],
  [4, "Eagle"],
  [5, "Eagle-eyed Eagle"],
];

const ROWS = [
  "Birds",
  "Bonus cards",
  "End-of-round goals",
  "Eggs",
  "Food on cards",
  "Tucked cards",
];
const YOU = [38, 7, 12, 9, 4, 6];
const RIVAL = [31, 9, 10, 7, 5, 8];
// The Automa scores birds, goals and eggs only.
const AUTOMA_ROWS = new Set([0, 2, 3]);
const AUTOMA = { faceUp: 21, faceDown: 5, goals: 14, eggs: 11 };

const automaTotal = (d: Difficulty) =>
  AUTOMA.faceUp + AUTOMA.faceDown * d + AUTOMA.goals + AUTOMA.eggs;

/** The sheet, with or without the Automa's column. */
const Sheet = ({
  title,
  titleSlot,
  automa,
  rival,
  difficulty,
  automaHeader,
  addSlot,
}: {
  title: string;
  titleSlot?: React.ReactNode;
  automa: boolean;
  rival?: boolean;
  difficulty: Difficulty;
  automaHeader?: React.ReactNode;
  addSlot?: React.ReactNode;
}) => {
  const you = YOU.reduce((a, b) => a + b, 0);
  const them = rival
    ? RIVAL.reduce((a, b) => a + b, 0)
    : automaTotal(difficulty);
  const automaCell = (row: number) => {
    if (!AUTOMA_ROWS.has(row)) return <td className="mk-blank" />;
    if (row === 0)
      return (
        <td className="mk-birds">
          <span>{AUTOMA.faceUp}</span>
          <small>
            +{AUTOMA.faceDown} face-down ×{difficulty}
          </small>
        </td>
      );
    return <td>{row === 2 ? AUTOMA.goals : AUTOMA.eggs}</td>;
  };
  return (
    <>
      <div className="mk-sheet">
        <table className={`mk-table${automa ? " has-automa" : ""}`}>
          <thead>
            <tr>
              <th className="mk-title hand-caps">{titleSlot ?? title}</th>
              <th className="hand-caps">JOR</th>
              {rival && <th className="hand-caps">ANN</th>}
              {automa && (
                <th className="hand-caps mk-automa-head">
                  {automaHeader ?? "Automa"}
                </th>
              )}
              {addSlot !== undefined && <th className="mk-add">{addSlot}</th>}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((label, row) => (
              <tr key={label}>
                <th className="hand-caps">{label}</th>
                <td>{YOU[row]}</td>
                {rival && <td>{RIVAL[row]}</td>}
                {automa && automaCell(row)}
                {addSlot !== undefined && <td className="mk-add" />}
              </tr>
            ))}
            <tr className="mk-total">
              <th className="hand-caps">Total</th>
              <td>
                {(automa || rival) && you < them ? (
                  you
                ) : (
                  <span className="leader">{you}</span>
                )}
              </td>
              {(automa || rival) && (
                <td>
                  {you < them ? <span className="leader">{them}</span> : them}
                </td>
              )}
              {addSlot !== undefined && <td className="mk-add" />}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sheet-result mk-result">
        {rival
          ? `Jordan won with ${you}`
          : !automa
            ? `Jordan scored ${you}`
            : you > them
              ? `Jordan beat the Automa, ${you} to ${them}`
              : you < them
                ? `The Automa won with ${them}`
                : `Tied at ${you}: the Automa has 2 unused food`}
      </p>
    </>
  );
};

/** The three difficulties as themed radio rows, like the expansion checklist. */
const DifficultyOptions = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) => (
  <div className="mk-difficulties" role="radiogroup" aria-label="Difficulty">
    {DIFFICULTIES.map(([d, label]) => (
      <label key={d} className="mix-option">
        <input
          type="radio"
          name={name}
          checked={value === d}
          onChange={() => onChange(d)}
        />
        <span>{label}</span>
      </label>
    ))}
  </div>
);

/** Under the sheet: names the difficulty, and opens the options on a tap. */
const DifficultyPicker = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = DIFFICULTIES.find(([d]) => d === value)?.[1];
  return (
    <div className="mk-anchor hand-caps">
      <button
        type="button"
        className="mk-difficulty-button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Automa difficulty: <span className="text-link">{label}</span>{" "}
        {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mix-popover mk-difficulty-popover">
          <p className="mix-hint">How tough is the Automa?</p>
          <DifficultyOptions
            name={name}
            value={value}
            onChange={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

const Tabs = ({ extra }: { extra?: React.ReactNode }) => (
  <div className="mk-tabs hand-caps">
    <span className="mk-tab is-on">Base</span>
    <span className="mk-tab">Expansions ▾</span>
    {extra}
  </div>
);

/** A: the corner title opens a short menu of modes. */
const Corner = () => {
  const [mode, setMode] = useState<"multiplayer" | "solo" | "automa">("solo");
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(4);
  const title = { multiplayer: "Multiplayer", solo: "Solo", automa: "Automa" }[
    mode
  ];
  return (
    <div className="mk-phone">
      <Tabs />
      <div className="mk-anchor">
        <Sheet
          title={title}
          automa={mode === "automa"}
          rival={mode === "multiplayer"}
          difficulty={difficulty}
          titleSlot={
            <button
              type="button"
              className="mk-corner hand-caps"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {title} ▾
            </button>
          }
        />
        {open && (
          <div className="mix-popover mk-corner-popover hand-caps">
            <p className="mix-hint">Who are you playing?</p>
            {(
              [
                ["multiplayer", "Multiplayer"],
                ["solo", "Solo"],
                ["automa", "Automa"],
              ] as const
            ).map(([m, label]) => (
              <label key={m} className="mix-option">
                <input
                  type="radio"
                  name="corner-mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                <span>{label}</span>
              </label>
            ))}
            {mode === "automa" && (
              <>
                <p className="mix-hint mk-subhint">Difficulty</p>
                <DifficultyOptions
                  name="corner-difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </>
            )}
            <div className="mix-footer">
              <button
                type="button"
                className="text-link mix-done"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** B: the + column offers a player or the Automa. */
const AddColumn = () => {
  const [automa, setAutoma] = useState(false);
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(4);
  return (
    <div className="mk-phone">
      <Tabs />
      <div className="mk-anchor">
        <Sheet
          title={automa ? "Automa" : "Solo"}
          automa={automa}
          difficulty={difficulty}
          automaHeader={
            <span className="mk-automa-name">
              Automa
              <button
                type="button"
                className="mk-remove"
                aria-label="Remove the Automa"
                onClick={() => setAutoma(false)}
              >
                ×
              </button>
            </span>
          }
          addSlot={
            automa ? undefined : (
              <button
                type="button"
                className="mk-plus"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                +
              </button>
            )
          }
        />
        {open && !automa && (
          <div className="mk-popover mk-popover-right">
            <button
              type="button"
              className="mk-choice hand-caps"
              onClick={() => setOpen(false)}
            >
              Add a player
            </button>
            <button
              type="button"
              className="mk-choice hand-caps"
              onClick={() => {
                setAutoma(true);
                setOpen(false);
              }}
            >
              Add the Automa
            </button>
          </div>
        )}
      </div>
      {automa && (
        <DifficultyPicker
          name="add-difficulty"
          value={difficulty}
          onChange={setDifficulty}
        />
      )}
    </div>
  );
};

/** C: a tab beside the expansions turns the Automa on and off. */
const Tab = () => {
  const [automa, setAutoma] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(4);
  return (
    <div className="mk-phone">
      <Tabs
        extra={
          <button
            type="button"
            className={`mk-tab mk-tab-automa${automa ? " is-on" : ""}`}
            aria-pressed={automa}
            onClick={() => setAutoma((a) => !a)}
          >
            {automa ? "✓ " : ""}Automa
          </button>
        }
      />
      <Sheet
        title={automa ? "Automa" : "Solo"}
        automa={automa}
        difficulty={difficulty}
      />
      {automa && (
        <DifficultyPicker
          name="tab-difficulty"
          value={difficulty}
          onChange={setDifficulty}
        />
      )}
    </div>
  );
};

export default function Mockups() {
  return (
    <main className="mk">
      <p className="mk-intro">
        Three ways to switch a solo game to playing against the Automa (A also
        offers Multiplayer). Each phone works: switch the Automa on and off, and
        change its difficulty. The Automa scores only birds, end-of-round goals
        and eggs; its face-down birds are worth 3, 4 or 5 by difficulty. The
        scores are made up.
      </p>

      <section className="mk-option">
        <h2 className="hand-caps">A · The corner is the switch</h2>
        <p className="mk-note">
          The sheet&apos;s corner already names the mode. Tap it for Solo or
          Automa, with the difficulty right there. Only offered with one player.
        </p>
        <Corner />
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">B · Add the Automa like a player</h2>
        <p className="mk-note">
          The + column offers a player or the Automa. The Automa gets its own
          column, and its × takes it away again. The difficulty sits under the
          sheet.
        </p>
        <AddColumn />
      </section>

      <section className="mk-option">
        <h2 className="hand-caps">C · A tab, like an expansion</h2>
        <p className="mk-note">
          An Automa tab beside Base and Expansions turns it on and off. The
          difficulty sits under the sheet.
        </p>
        <Tab />
      </section>
    </main>
  );
}
