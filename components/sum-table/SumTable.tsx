"use client";
import React, { useRef, useState } from "react";
import "./styles/sum-table-styles.css";
import { CurrentGame, missingScores, playerHasData } from "@/lib/game";
import { Move, nextCell } from "@/lib/gridNavigation";
import { codeFor, MAX_NAME_LENGTH, withCodes } from "@/lib/names";
import {
  categoriesFor,
  GROUP_LABELS,
  HABITAT_LABELS,
  HABITATS,
  usesFriendlyNectarTies,
} from "@/lib/rules";
import {
  describeTiebreak,
  displayName,
  isValidScoreInput,
  parseScore,
  PlayerSheet,
  scoreGame,
  scoreNectarHabitat,
  summarize,
} from "@/lib/scoring";

/** One row of inputs on the sheet: a scoring category or a nectar habitat. */
interface InputRow {
  key: string;
  label: string;
  hint: string;
  group: string;
  allowsNegative?: boolean;
  value: (p: PlayerSheet) => string;
  update: (p: PlayerSheet, value: string) => PlayerSheet;
  /** Nectar points earned in this habitat, shown beside the count. */
  points?: number[];
}

const KEY_MOVES: Record<string, Move> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export const sheetTitle = ({
  config,
  players,
}: Pick<CurrentGame, "config"> & { players: unknown[] }) => {
  if (config.asia === "duet") return "Duet";
  if (config.asia === "flock") return "Flock";
  return players.length === 1 ? "Solo" : "Multiplayer";
};

const SumTable = ({
  game,
  onPlayersChange,
  onAddPlayer,
  onRemovePlayer,
  idPrefix = "",
}: {
  game: Pick<CurrentGame, "config" | "players">;
  onPlayersChange: (players: PlayerSheet[]) => void;
  /** When set, the sheet gets a "+ Player" column. */
  onAddPlayer?: () => void;
  /** When set, each name gets a remove button. */
  onRemovePlayer?: (col: number) => void;
  /** Keeps box ids apart when a second sheet is open, in Past games. */
  idPrefix?: string;
}) => {
  const { config, players } = game;
  const { totals, outcome } = scoreGame(config, players);
  const names = players.map(displayName);
  const codes = withCodes(players);
  // The name being typed shows in full; every other header shows its code.
  const [editing, setEditing] = useState<number | null>(null);
  const nameAtFocus = useRef("");

  // A player's code is set once, when they finish entering a new name, and
  // only theirs: nobody else's code shifts while someone types.
  const finishName = (col: number) => {
    setEditing(null);
    const player = players[col];
    if (player.name === nameAtFocus.current) return;
    const others = players
      .map((p, i) => ({ name: p.name, code: codes[i] }))
      .filter((_, i) => i !== col);
    setPlayer(col, {
      ...player,
      code: codeFor(player.name, others) || undefined,
    });
  };

  const rows: InputRow[] = categoriesFor(config)
    .filter(c => c.id !== "nectar")
    .map(c => ({
      key: c.id,
      label: c.label,
      hint: c.hint,
      group: GROUP_LABELS[c.group],
      allowsNegative: c.allowsNegative,
      value: p => p.scores[c.id] ?? "",
      update: (p, v) => ({ ...p, scores: { ...p.scores, [c.id]: v } }),
    }));

  if (config.oceania) {
    for (const habitat of HABITATS) {
      rows.push({
        key: `nectar-${habitat}`,
        label: HABITAT_LABELS[habitat],
        hint: `Nectar spent in the ${HABITAT_LABELS[habitat].toLowerCase()}`,
        group: `Nectar ${GROUP_LABELS.majority}`,
        value: p => p.nectarSpent[habitat] ?? "",
        update: (p, v) => ({
          ...p,
          nectarSpent: { ...p.nectarSpent, [habitat]: v },
        }),
        points: scoreNectarHabitat(
          players.map(p => parseScore(p.nectarSpent[habitat])),
          usesFriendlyNectarTies(config)
        ),
      });
    }
  }

  // Nobody wins, and no tie needs breaking, until every box is filled in.
  const missing = missingScores(game);
  const finished = missing === 0;
  // Unused food only matters when players are tied for the most points.
  const showTiebreak = finished && outcome.leaders.length > 1;
  const tiebreakRow = rows.length;
  const rowCount = showTiebreak ? rows.length + 1 : rows.length;
  const isEnabled = (row: number, col: number) =>
    row < tiebreakRow || outcome.leaders.includes(col);

  const setPlayer = (col: number, next: PlayerSheet) =>
    onPlayersChange(players.map((p, i) => (i === col ? next : p)));

  const handleCellChange = (
    value: string,
    row: number,
    col: number,
    allowsNegative = false
  ) => {
    if (!isValidScoreInput(value, allowsNegative)) return;
    const player = players[col];
    setPlayer(
      col,
      row === tiebreakRow
        ? { ...player, unusedFood: value }
        : rows[row].update(player, value)
    );
  };

  const focus = (id: string) =>
    (document.getElementById(idPrefix + id) as HTMLInputElement | null)?.focus();

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    col: number
  ) => {
    const move: Move | undefined =
      e.key === "Enter"
        ? e.shiftKey
          ? "up-wrap"
          : "down-wrap"
        : KEY_MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    const next = nextCell({ row, col }, move, rowCount, players.length, c =>
      isEnabled(c.row, c.col)
    );
    if (next) focus(`cell-${next.row}-${next.col}`);
    else if (row === 0 && (move === "up" || move === "up-wrap"))
      focus(`name-${col}`);
  };

  // Enter closes the name box; Down moves into that player's scores.
  const handleNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    col: number
  ) => {
    if (e.key === "Enter") {
      // Names go across: on to the next player, or done after the last.
      e.preventDefault();
      if (col < players.length - 1) focus(`name-${col + 1}`);
      else e.currentTarget.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focus(`cell-0-${col}`);
    }
  };

  // Hummingbird points can be negative. Every box takes digits on the
  // phone's number pad, which has no minus key, so a hummingbird box gets a
  // sign tab to tap instead (or the minus key on a keyboard). The sign is
  // kept as a leading "-" in the score, even before any digits are typed.
  const flipSign = (value: string) =>
    value.startsWith("-") ? value.slice(1) : `-${value}`;

  const renderInput = (
    value: string,
    row: number,
    col: number,
    label: string,
    allowsNegative?: boolean
  ) => {
    const negative = !!allowsNegative && value.startsWith("-");
    const id = `${idPrefix}cell-${row}-${col}`;
    const input = (
      <input
        className={`score-input${negative ? " is-negative" : ""}`}
        type="text"
        value={allowsNegative ? value.replace(/^-/, "") : value}
        onChange={e => {
          const typed = e.target.value;
          // A typed or pasted "-7" sets the sign itself.
          const next =
            negative && !typed.startsWith("-") ? `-${typed}` : typed;
          handleCellChange(next, row, col, allowsNegative);
        }}
        onKeyDown={e => {
          if (allowsNegative && e.key === "-") {
            e.preventDefault();
            handleCellChange(flipSign(value), row, col, true);
          }
          handleCellKeyDown(e, row, col);
        }}
        onFocus={e => e.target.select()}
        inputMode="numeric"
        id={id}
        // The box shows only digits, so say the sign.
        aria-label={`${label}, ${names[col]}${negative ? ", minus" : ""}`}
        aria-keyshortcuts={allowsNegative ? "-" : undefined}
        disabled={!isEnabled(row, col)}
      />
    );
    if (!allowsNegative) return input;
    return (
      <div className="signed-score">
        <button
          type="button"
          className={`sign-tab${negative ? " is-negative" : ""}`}
          tabIndex={-1}
          aria-label={`${label}, ${names[col]}: ${negative ? "minus" : "plus"}. Switch sign`}
          aria-pressed={negative}
          // Pressing leaves focus where it is, so nothing moves mid-tap (a
          // keyboard closing under the finger made phones drop the tap).
          onPointerDown={e => {
            if (e.button === 0) e.preventDefault();
          }}
          // Then the flip, and the keyboard goes away unless this box was the
          // one being typed in: only a tap inside a box brings it up.
          onClick={() => {
            handleCellChange(flipSign(value), row, col, true);
            const active = document.activeElement;
            if (active instanceof HTMLInputElement && active.id !== id)
              active.blur();
          }}
        >
          {negative ? "−" : "+"}
        </button>
        {input}
      </div>
    );
  };

  const result = summarize(outcome, names);
  const detail = describeTiebreak(
    outcome,
    names,
    players.map(p => p.unusedFood)
  );
  const circled =
    !finished ||
    outcome.decision === "needs-food" ||
    outcome.decision === "none"
      ? []
      : outcome.winners;

  return (
    <div className="score-sheet">
      <div className="sheet-scroll">
        <table
          id="sum-table"
          className={onAddPlayer ? "has-add" : undefined}
          style={{ "--players": players.length } as React.CSSProperties}
        >
          <colgroup>
            <col className="group-col" />
            <col className="label-col" />
            {players.map(p => (
              <col key={p.id} />
            ))}
            {onAddPlayer && <col className="add-col" />}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} className="sheet-title hand-caps">
                {sheetTitle(game)}
              </th>
              {players.map((player, col) => (
                <th key={player.id} className="player-cell">
                  <input
                    className={`player-input${editing === col ? " is-editing" : ""}${
                      col === players.length - 1 && !onAddPlayer
                        ? " edit-from-end"
                        : ""
                    }`}
                    placeholder={editing === col ? "Name" : `P${col + 1}`}
                    type="text"
                    value={editing === col ? player.name : codes[col]}
                    onChange={e =>
                      setPlayer(col, {
                        ...player,
                        name: e.target.value.slice(0, MAX_NAME_LENGTH),
                      })
                    }
                    onFocus={e => {
                      setEditing(col);
                      nameAtFocus.current = player.name;
                      // Select the full name once it has replaced the code,
                      // unless typing has already begun: selecting then would
                      // let the next letter replace the first.
                      const input = e.target;
                      const name = player.name;
                      requestAnimationFrame(() => {
                        if (input.value === name) input.select();
                      });
                    }}
                    onBlur={() => finishName(col)}
                    onKeyDown={e => handleNameKeyDown(e, col)}
                    id={`${idPrefix}name-${col}`}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint={col < players.length - 1 ? "next" : "done"}
                    aria-label={`Player ${col + 1} name`}
                  />
                  {onRemovePlayer && (
                    <button
                      type="button"
                      className="remove-player"
                      onClick={() => onRemovePlayer(col)}
                      aria-label={`Remove ${names[col]}`}
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
              {onAddPlayer && (
                <th className="add-cell">
                  <button
                    type="button"
                    className="add-player hand-caps"
                    onClick={onAddPlayer}
                  >
                    +<span className="add-player-label"> Player</span>
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const startsGroup =
                rowIndex === 0 || rows[rowIndex - 1].group !== row.group;
              return (
                <tr key={row.key} className={startsGroup ? "group-start" : ""}>
                  {startsGroup && (
                    <th
                      rowSpan={rows.filter(r => r.group === row.group).length}
                      className="group-label hand-caps"
                    >
                      <span>{row.group}</span>
                    </th>
                  )}
                  <th
                    scope="row"
                    className="row-label hand-caps"
                    title={row.hint}
                  >
                    <span>{row.label}</span>
                  </th>
                  {players.map((player, col) => (
                    <td key={player.id} className="score-cell">
                      {renderInput(
                        row.value(player),
                        rowIndex,
                        col,
                        row.label,
                        row.allowsNegative
                      )}
                      {row.points && row.points[col] > 0 && (
                        <span className="nectar-points" aria-hidden="true">
                          +{row.points[col]}
                        </span>
                      )}
                    </td>
                  ))}
                  {onAddPlayer && <td className="add-cell" />}
                </tr>
              );
            })}
            <tr className="total-row">
              <th colSpan={2} scope="row" className="hand-caps">
                Total
              </th>
              {totals.map((total, col) => (
                <td key={players[col].id}>
                  {playerHasData(players[col], config) && (
                    <span className={circled.includes(col) ? "leader" : ""}>
                      {total}
                    </span>
                  )}
                </td>
              ))}
              {onAddPlayer && <td className="add-cell" />}
            </tr>
            {showTiebreak && (
              <tr className="tiebreak-row">
                <th colSpan={2} scope="row" className="row-label hand-caps">
                  <span>Unused food</span>
                  <small>Tiebreak</small>
                </th>
                {players.map((player, col) => (
                  <td key={player.id} className="score-cell">
                    {renderInput(
                      // Food from an earlier tie stays stored, but only the
                      // players tied now see it.
                      isEnabled(tiebreakRow, col) ? player.unusedFood : "",
                      tiebreakRow,
                      col,
                      "Unused food"
                    )}
                  </td>
                ))}
                {onAddPlayer && <td className="add-cell" />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {outcome.decision !== "none" && !finished && (
        <p className="sheet-result sheet-pending" aria-live="polite">
          {missing} {missing === 1 ? "box" : "boxes"} left to fill
        </p>
      )}
      {outcome.decision !== "none" && finished && (
        <p className="sheet-result" aria-live="polite">
          {result}
          {outcome.decision === "needs-food" && (
            <span> · enter unused food to break the tie</span>
          )}
          {detail && <span className="sheet-result-detail">{detail}</span>}
        </p>
      )}
    </div>
  );
};

export default SumTable;
