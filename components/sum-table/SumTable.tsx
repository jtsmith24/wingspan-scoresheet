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
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focus(`cell-0-${col}`);
    }
  };

  // Hummingbird points can be negative. A number field brings up a phone
  // keyboard with a minus key (iPhone's numbers-and-symbols page, Android's
  // number pad); the plain number pad that other boxes get has none. The
  // browser does the editing, with a few rules on top:
  // - A minus flips the sign of the number there, so "5-" reads -5. On an
  //   empty box, or one just focused (its score selected, so replaced), it
  //   starts a negative number. A field can't show a lone "-", so it's kept
  //   as a pending minus, shown as the placeholder, for the digits typed next.
  //   Leaving the box drops it.
  // - Other symbols are refused.
  // - Text the field can't read ("1e", or whatever a keyboard forces in)
  //   never replaces the score: the last good one is put straight back.
  const signedTyping =
    (value: string, row: number, col: number) =>
    (el: HTMLInputElement | null) => {
      if (!el) return;
      const set = (next: string) => handleCellChange(next, row, col, true);
      const pend = () => {
        el.value = "";
        el.dataset.pending = "1";
        set("-");
      };
      const onBeforeInput = (e: InputEvent) => {
        // Only plain keystrokes the browser lets us stop; anything else
        // (predictions, composition) is checked once it lands.
        if (!e.cancelable || e.isComposing || e.inputType !== "insertText")
          return;
        const data = e.data ?? "";
        if (/^-?\d+$/.test(data)) return;
        e.preventDefault();
        if (data !== "-") return;
        const fresh = el.dataset.fresh === "1";
        delete el.dataset.fresh;
        if (value === "-") {
          delete el.dataset.pending;
          set("");
        } else if (fresh || value === "") pend();
        else set(value.startsWith("-") ? value.slice(1) : `-${value}`);
      };
      // Runs before React's onChange, which skips unreadable text.
      const onInput = (e: Event) => {
        delete el.dataset.fresh;
        if (!el.validity.badInput) {
          // Emptied: React may see "" both times and miss it.
          if (el.value === "" && value !== "" && value !== "-") set("");
          return;
        }
        // Backspacing "-1" leaves a lone minus: keep it pending.
        const { inputType } = e as InputEvent;
        if (inputType?.startsWith("delete") && /^-\d$/.test(value)) pend();
        else el.value = value === "-" ? "" : value;
      };
      el.addEventListener("beforeinput", onBeforeInput);
      el.addEventListener("input", onInput);
      return () => {
        el.removeEventListener("beforeinput", onBeforeInput);
        el.removeEventListener("input", onInput);
      };
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
      type={allowsNegative ? "number" : "text"}
      value={allowsNegative && value === "-" ? "" : value}
      placeholder={allowsNegative && value === "-" ? "−" : undefined}
      ref={allowsNegative ? signedTyping(value, row, col) : undefined}
      onChange={e => {
        if (!allowsNegative)
          return handleCellChange(e.target.value, row, col, false);
        if (e.target.validity.badInput) return;
        const typed = e.target.value;
        // Digits typed straight after a pending minus make a negative.
        const pending =
          value === "-" &&
          e.target.dataset.pending === "1" &&
          (e.nativeEvent as InputEvent).inputType === "insertText" &&
          /^\d+$/.test(typed);
        delete e.target.dataset.pending;
        handleCellChange(pending ? `-${typed}` : typed, row, col, true);
      }}
      onPaste={
        allowsNegative
          ? e => {
              delete e.currentTarget.dataset.pending;
              delete e.currentTarget.dataset.fresh;
            }
          : undefined
      }
      onBlur={
        allowsNegative
          ? e => {
              delete e.target.dataset.pending;
              if (value === "-") handleCellChange("", row, col, true);
            }
          : undefined
      }
      onKeyDown={e => {
        // Backspace on a pending minus: the field looks empty, so clear it.
        if (allowsNegative && value === "-" && e.key === "Backspace") {
          e.preventDefault();
          delete e.currentTarget.dataset.pending;
          e.currentTarget.value = "";
          handleCellChange("", row, col, true);
        }
        handleCellKeyDown(e, row, col);
      }}
      // A wheel over a focused number field would change the score.
      onWheel={allowsNegative ? e => e.currentTarget.blur() : undefined}
      onFocus={e => {
        e.target.select();
        if (allowsNegative) e.target.dataset.fresh = "1";
      }}
      // A tap inside a box already in use places the caret instead.
      onPointerDown={
        allowsNegative
          ? e => {
              if (document.activeElement === e.currentTarget)
                delete e.currentTarget.dataset.fresh;
            }
          : undefined
      }
      inputMode={allowsNegative ? undefined : "numeric"}
      id={`${idPrefix}cell-${row}-${col}`}
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
                      // Select the full name once it has replaced the code.
                      const input = e.target;
                      requestAnimationFrame(() => input.select());
                    }}
                    onBlur={() => finishName(col)}
                    onKeyDown={e => handleNameKeyDown(e, col)}
                    id={`${idPrefix}name-${col}`}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="done"
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
