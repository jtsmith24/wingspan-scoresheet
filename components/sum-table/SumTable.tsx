"use client";
import React, { useState } from "react";
import "./styles/sum-table-styles.css";
import { ScoreIcon, ScoreIconName } from "../ScoreIcon";
import { CurrentGame, playerHasData } from "@/lib/game";
import { Move, nextCell } from "@/lib/gridNavigation";
import { MAX_NAME_LENGTH, shortCodes } from "@/lib/names";
import {
  categoriesFor,
  CategoryId,
  GROUP_LABELS,
  Habitat,
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

export const CATEGORY_ICONS: Partial<
  Record<CategoryId | Habitat, ScoreIconName>
> = {
  birds: "bird",
  bonus: "bonus",
  goals: "goal",
  eggs: "egg",
  food: "food",
  tucked: "tucked",
  duet: "duet",
  hummingbirds: "hummingbird",
  forest: "forest",
  grassland: "grassland",
  wetland: "wetland",
};

/** One row of inputs on the sheet: a scoring category or a nectar habitat. */
interface InputRow {
  key: string;
  label: string;
  hint: string;
  icon?: ScoreIconName;
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
  rememberedNames,
  onAddPlayer,
  onRemovePlayer,
}: {
  game: CurrentGame;
  onPlayersChange: (players: PlayerSheet[]) => void;
  rememberedNames: string[];
  /** When set, the sheet gets a "+ Player" column. */
  onAddPlayer?: () => void;
  /** When set, each name gets a remove button. */
  onRemovePlayer?: (col: number) => void;
}) => {
  const { config, players } = game;
  const { totals, outcome } = scoreGame(config, players);
  const names = players.map(displayName);
  const codes = shortCodes(players.map(p => p.name));
  // The name being typed shows in full; every other header shows its code.
  const [editing, setEditing] = useState<number | null>(null);
  const legend = players.flatMap((p, i) =>
    codes[i] && p.name.trim().toUpperCase() !== codes[i]
      ? [{ code: codes[i], name: p.name.trim() }]
      : []
  );

  const rows: InputRow[] = categoriesFor(config)
    .filter(c => c.id !== "nectar")
    .map(c => ({
      key: c.id,
      label: c.label,
      hint: c.hint,
      icon: CATEGORY_ICONS[c.id],
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
        icon: CATEGORY_ICONS[habitat],
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

  // Unused food only matters when players are tied for the most points.
  const showTiebreak = outcome.leaders.length > 1;
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
    (document.getElementById(id) as HTMLInputElement | null)?.focus();

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

  const handleNameKeyDown = (e: React.KeyboardEvent, col: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focus(`cell-0-${col}`);
    }
  };

  const renderInput = (
    value: string,
    row: number,
    col: number,
    label: string,
    allowsNegative?: boolean
  ) => (
    <input
      className="score-input"
      type="text"
      value={value}
      onChange={e => handleCellChange(e.target.value, row, col, allowsNegative)}
      onKeyDown={e => handleCellKeyDown(e, row, col)}
      onFocus={e => e.target.select()}
      inputMode={allowsNegative ? "text" : "numeric"}
      id={`cell-${row}-${col}`}
      aria-label={`${label}, ${names[col]}`}
      disabled={!isEnabled(row, col)}
    />
  );

  const result = summarize(outcome, names);
  const detail = describeTiebreak(
    outcome,
    names,
    players.map(p => p.unusedFood)
  );
  const circled =
    outcome.decision === "needs-food" || outcome.decision === "none"
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
                      // Select the full name once it has replaced the code.
                      const input = e.target;
                      requestAnimationFrame(() => input.select());
                    }}
                    onBlur={() => setEditing(null)}
                    onKeyDown={e => handleNameKeyDown(e, col)}
                    id={`name-${col}`}
                    list="remembered-names"
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    autoCapitalize="words"
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
                    {row.icon && <ScoreIcon name={row.icon} />}
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
                  <ScoreIcon name="food" />
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
      {legend.length > 0 && (
        <p className="name-key">
          {legend.map(({ code, name }) => (
            <span key={code}>
              <b>{code}</b> {name}
            </span>
          ))}
        </p>
      )}
      {outcome.decision !== "none" && (
        <p className="sheet-result" aria-live="polite">
          {result}
          {outcome.decision === "needs-food" && (
            <span> · enter unused food to break the tie</span>
          )}
          {detail && <span className="sheet-result-detail">{detail}</span>}
        </p>
      )}
      <datalist id="remembered-names">
        {rememberedNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
};

export default SumTable;
