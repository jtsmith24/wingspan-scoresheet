"use client";
import React, { useRef, useState } from "react";
import "./styles/sum-table-styles.css";
import {
  automaOf,
  CurrentGame,
  missingScores,
  playerHasData,
} from "@/lib/game";
import { Move, nextCell } from "@/lib/gridNavigation";
import { codeFor, MAX_NAME_LENGTH, withCodes } from "@/lib/names";
import {
  automaTokensInPlay,
  categoriesFor,
  GROUP_LABELS,
  HABITAT_LABELS,
  HABITATS,
  scoredBy,
  tokensPerEgg,
  usesFriendlyNectarTies,
} from "@/lib/rules";
import {
  AUTOMA_NAME,
  AutomaInput,
  automaHasData,
  AutomaSheet,
  automaTiebreak,
  describeTiebreak,
  displayName,
  isValidScoreInput,
  parseScore,
  PlayerSheet,
  scoreGame,
  scoreNectarHabitat,
  summarize,
} from "@/lib/scoring";

/** One box's value in a column, and how typing changes it. */
interface Field<T> {
  value: (sheet: T) => string;
  update: (sheet: T, value: string) => T;
}

/** One row of inputs on the sheet: a scoring category or a nectar habitat. */
interface InputRow {
  key: string;
  label: string;
  hint: string;
  group: string;
  allowsNegative?: boolean;
  /** The players' box, unless only the Automa has one (its tokens). */
  player?: Field<PlayerSheet>;
  /** The Automa's box, if it scores this row. */
  automa?: Field<AutomaSheet>;
  /** Nectar points earned in this habitat, shown beside the count. */
  points?: number[];
}

const scoreField = (key: AutomaInput): Field<AutomaSheet> => ({
  value: a => a.scores[key] ?? "",
  update: (a, v) => ({ ...a, scores: { ...a.scores, [key]: v } }),
});

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
  if (config.automa) return config.asia === "duet" ? "Duet · Automa" : "Automa";
  if (config.asia === "duet") return "Duet";
  if (config.asia === "flock") return "Flock";
  return players.length === 1 ? "Solo" : "Multiplayer";
};

const SumTable = ({
  game,
  onPlayersChange,
  onAutomaChange,
  onAddPlayer,
  onRemovePlayer,
  title,
  idPrefix = "",
}: {
  game: Pick<CurrentGame, "config" | "players" | "automa">;
  onPlayersChange: (players: PlayerSheet[]) => void;
  onAutomaChange?: (automa: AutomaSheet) => void;
  /** In place of the mode named in the corner: the menu to change it. */
  title?: React.ReactNode;
  /** When set, the sheet gets a "+ Player" column. */
  onAddPlayer?: () => void;
  /** When set, each name gets a remove button. */
  onRemovePlayer?: (col: number) => void;
  /** Keeps box ids apart when a second sheet is open, in Past games. */
  idPrefix?: string;
}) => {
  const { config, players } = game;
  // Against the Automa, its column comes after the player's.
  const automa = automaOf(game);
  const automaCol = players.length;
  const cols = players.length + (automa ? 1 : 0);
  const { totals, outcome } = scoreGame(config, players, automa);
  const names = [...players.map(displayName), AUTOMA_NAME];
  const columnName = (col: number) => (col === automaCol ? "Automa" : names[col]);
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
      player: scoredBy(c.id, "player")
        ? {
            value: p => p.scores[c.id] ?? "",
            update: (p, v) => ({ ...p, scores: { ...p.scores, [c.id]: v } }),
          }
        : undefined,
      // Its birds row is face-up points here; the face-down count is extra.
      automa: scoredBy(c.id, "automa")
        ? scoreField(c.id === "cache" ? "tokens" : c.id)
        : undefined,
    }));

  if (config.oceania) {
    for (const habitat of HABITATS) {
      rows.push({
        key: `nectar-${habitat}`,
        label: HABITAT_LABELS[habitat],
        hint: `Nectar spent in the ${HABITAT_LABELS[habitat].toLowerCase()}`,
        group: `Nectar ${GROUP_LABELS.majority}`,
        player: {
          value: p => p.nectarSpent[habitat] ?? "",
          update: (p, v) => ({
            ...p,
            nectarSpent: { ...p.nectarSpent, [habitat]: v },
          }),
        },
        automa: {
          value: a => a.nectarSpent[habitat] ?? "",
          update: (a, v) => ({
            ...a,
            nectarSpent: { ...a.nectarSpent, [habitat]: v },
          }),
        },
        points: scoreNectarHabitat(
          [...players, ...(automa ? [automa] : [])].map(p =>
            parseScore(p.nectarSpent[habitat])
          ),
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
  // Shaded boxes (rows a side doesn't score) and food for players who
  // aren't tied can't be typed in. The Automa's tie-break is worked out.
  const isEnabled = (row: number, col: number) =>
    row < tiebreakRow
      ? !!(col === automaCol ? rows[row].automa : rows[row].player)
      : col !== automaCol && outcome.leaders.includes(col);

  const setPlayer = (col: number, next: PlayerSheet) =>
    onPlayersChange(players.map((p, i) => (i === col ? next : p)));

  const birdsRow = rows.findIndex(r => r.key === "birds");
  const faceDown = scoreField("faceDown");
  // The Automa's birds box holds two inputs: face-down count, then points.
  const isAutomaBirds = (row: number, col: number) =>
    !!automa && col === automaCol && row === birdsRow;

  const handleCellChange = (
    value: string,
    row: number,
    col: number,
    allowsNegative = false,
    second = false
  ) => {
    if (!isValidScoreInput(value, allowsNegative)) return;
    if (col === automaCol) {
      if (!automa) return;
      const field =
        isAutomaBirds(row, col) && !second ? faceDown : rows[row].automa;
      if (field) onAutomaChange?.(field.update(automa, value));
      return;
    }
    const player = players[col];
    const field = rows[row]?.player;
    if (row === tiebreakRow) setPlayer(col, { ...player, unusedFood: value });
    else if (field) setPlayer(col, field.update(player, value));
  };

  // When an ended game's scores lift off, they go row by row, top to bottom.
  const liftDelay = (row: number) =>
    ({ "--lift-delay": `${(row / rows.length) * 0.25}s` }) as React.CSSProperties;

  const focus = (id: string) =>
    (document.getElementById(idPrefix + id) as HTMLInputElement | null)?.focus();

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    col: number,
    second = false
  ) => {
    const move: Move | undefined =
      e.key === "Enter"
        ? e.shiftKey
          ? "up-wrap"
          : "down-wrap"
        : KEY_MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    const up = move === "up" || move === "up-wrap";
    // Within the Automa's birds box: face-down count above, points below.
    const vertical = move !== "left" && move !== "right";
    if (isAutomaBirds(row, col) && vertical && second === up) {
      focus(`cell-${row}-${col}${second ? "" : "-up"}`);
      return;
    }
    const next = nextCell({ row, col }, move, rowCount, cols, c =>
      isEnabled(c.row, c.col)
    );
    if (next)
      focus(
        `cell-${next.row}-${next.col}${
          up && isAutomaBirds(next.row, next.col) ? "-up" : ""
        }`
      );
    else if (row === 0 && up && col !== automaCol) focus(`name-${col}`);
  };

  // Enter moves across the names, then into the first score; Down moves
  // into that player's scores.
  const handleNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    col: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focus(col < players.length - 1 ? `name-${col + 1}` : "cell-0-0");
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
    allowsNegative?: boolean,
    second = false,
    placeholder?: string
  ) => {
    const negative = !!allowsNegative && value.startsWith("-");
    const id = `${idPrefix}cell-${row}-${col}${second ? "-up" : ""}`;
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
          handleCellChange(next, row, col, allowsNegative, second);
        }}
        onKeyDown={e => {
          if (allowsNegative && e.key === "-") {
            e.preventDefault();
            handleCellChange(flipSign(value), row, col, true);
          }
          handleCellKeyDown(e, row, col, second);
        }}
        onFocus={e => e.target.select()}
        placeholder={placeholder}
        inputMode="numeric"
        id={id}
        // The box shows only digits, so say the sign.
        aria-label={`${label}, ${columnName(col)}${negative ? ", minus" : ""}`}
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
          aria-label={`${label}, ${columnName(col)}: ${negative ? "minus" : "plus"}. Switch sign`}
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

  const automaFood = automa ? automaTiebreak(config, automa) : 0;
  const result = summarize(outcome, names, automa ? automaCol : undefined);
  const detail = describeTiebreak(
    outcome,
    names,
    [...players.map(p => p.unusedFood), String(automaFood)],
    automa ? automaCol : undefined,
    automaTokensInPlay(config)
  );
  const difficulty = config.automa?.difficulty ?? 4;

  // The Automa's box in a row: shaded where it doesn't score; two inputs
  // for its birds; its tokens show the eggs they make.
  const automaCell = (row: InputRow, rowIndex: number) => {
    if (!automa) return null;
    const field = row.automa;
    if (!field) return <td key="automa" className="score-cell is-blank" />;
    const tokens = row.key === "cache" ? parseScore(field.value(automa)) : 0;
    const eggs = Math.floor(tokens / tokensPerEgg(difficulty));
    return (
      <td key="automa" className="score-cell automa-cell">
        {row.key === "birds" ? (
          <div className="automa-birds">
            <span className="face-down">
              {renderInput(
                faceDown.value(automa),
                rowIndex,
                automaCol,
                "Face-down birds",
                false,
                false,
                "face-down"
              )}
              <span aria-hidden="true">×{difficulty}</span>
            </span>
            {renderInput(
              field.value(automa),
              rowIndex,
              automaCol,
              "Face-up bird points",
              false,
              true,
              "face-up"
            )}
          </div>
        ) : row.key === "cache" ? (
          // Tokens as counted, before they become eggs.
          renderInput(
            field.value(automa),
            rowIndex,
            automaCol,
            "Cache/hoard tokens",
            false,
            false,
            "tokens"
          )
        ) : (
          renderInput(
            field.value(automa),
            rowIndex,
            automaCol,
            row.label,
            row.allowsNegative
          )
        )}
        {row.key === "cache" && field.value(automa) !== "" && (
          <span className="cache-eggs">
            = {eggs} {eggs === 1 ? "egg" : "eggs"}
          </span>
        )}
        {row.points && row.points[automaCol] > 0 && (
          <span className="nectar-points" aria-hidden="true">
            +{row.points[automaCol]}
          </span>
        )}
      </td>
    );
  };
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
          style={{ "--players": cols } as React.CSSProperties}
        >
          <colgroup>
            <col className="group-col" />
            <col className="label-col" />
            {players.map(p => (
              <col key={p.id} />
            ))}
            {automa && <col />}
            {onAddPlayer && <col className="add-col" />}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} className="sheet-title hand-caps">
                {title ?? sheetTitle(game)}
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
                    enterKeyHint="next"
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
              {automa && (
                <th className="player-cell automa-head hand-caps">Automa</th>
              )}
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
                <tr
                  key={row.key}
                  className={startsGroup ? "group-start" : ""}
                  style={liftDelay(rowIndex)}
                >
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
                  {players.map((player, col) =>
                    row.player ? (
                      <td key={player.id} className="score-cell">
                        {renderInput(
                          row.player.value(player),
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
                    ) : (
                      <td key={player.id} className="score-cell is-blank" />
                    )
                  )}
                  {automaCell(row, rowIndex)}
                  {onAddPlayer && <td className="add-cell" />}
                </tr>
              );
            })}
            <tr className="total-row" style={liftDelay(rows.length)}>
              <th colSpan={2} scope="row" className="hand-caps">
                Total
              </th>
              {totals.map((total, col) => (
                <td key={col === automaCol ? "automa" : players[col].id}>
                  {(col === automaCol
                    ? !!automa && automaHasData(automa, config)
                    : playerHasData(players[col], config)) && (
                    <span className={circled.includes(col) ? "leader" : ""}>
                      {total}
                    </span>
                  )}
                </td>
              ))}
              {onAddPlayer && <td className="add-cell" />}
            </tr>
            {showTiebreak && (
              <tr className="tiebreak-row" style={liftDelay(rows.length)}>
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
                {automa && (
                  <td className="score-cell automa-tiebreak">
                    <span>
                      {automaFood}
                      <small>
                        {automaTokensInPlay(config)
                          ? automaFood === 1
                            ? "token left"
                            : "tokens left"
                          : "food"}
                      </small>
                    </span>
                  </td>
                )}
                {onAddPlayer && <td className="add-cell" />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="sheet-result-wrap">
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
    </div>
  );
};

export default SumTable;
