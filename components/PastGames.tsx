"use client";
import React, { useEffect, useRef, useState } from "react";
import { Ask } from "./ConfirmDialog";
import { ScoreIcon } from "./ScoreIcon";
import { CATEGORY_ICONS, sheetTitle } from "./sum-table/SumTable";
import { SavedGame } from "@/lib/game";
import { withCodes } from "@/lib/names";
import { categoriesFor, describeConfig, GROUP_LABELS } from "@/lib/rules";

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

// Unnamed players were saved as "Player 2" and so on.
const isPlaceholder = (name: string) => /^Player \d+$/.test(name);

/** Header codes for a saved game, with P1, P2… for unnamed players. */
const codesFor = (game: SavedGame) => {
  const codes = withCodes(
    game.players.map(p => ({
      name: isPlaceholder(p.name) ? "" : p.name,
      code: p.code,
    }))
  );
  return codes.map((c, i) => c || `P${i + 1}`);
};

// A confirmation on top owns the keyboard: Escape and Tab are its, not ours.
const dialogOpen = () => !!document.querySelector("dialog[open]");

// A slight, stable tilt per slip so the stack looks hand-torn.
const TILTS = [-0.6, 0.5, -0.3, 0.7, -0.45, 0.35];

// A tie still waiting on unused food has no winner to circle yet.
const Total = ({ game, col }: { game: SavedGame; col: number }) =>
  game.decision !== "needs-food" && game.winners.includes(col) ? (
    <span className="leader">{game.players[col].total}</span>
  ) : (
    <>{game.players[col].total}</>
  );

/** Unfolded slip: the saved game's full sheet, read-only. */
const FullSheet = ({ game }: { game: SavedGame }) => {
  const categories = categoriesFor(game.config);
  const codes = codesFor(game);
  // Tapping a code shows that player's full name in its place.
  const [peek, setPeek] = useState<number | null>(null);
  const tiebreak = game.decision === "food" || game.decision === "shared";
  return (
    <>
      <div className="sheet-scroll">
        <table
          id="sum-table"
          className="past-sheet"
          style={{ "--players": game.players.length } as React.CSSProperties}
        >
          <colgroup>
            <col className="group-col" />
            <col className="label-col" />
            {game.players.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} className="sheet-title hand-caps">
                {sheetTitle(game)}
              </th>
              {codes.map((code, i) => {
                const { name } = game.players[i];
                return (
                  <th key={i} className="player-cell past-name">
                    {isPlaceholder(name) || name === code ? (
                      code
                    ) : (
                      <button
                        type="button"
                        className={`name-peek${peek === i ? " is-open" : ""}${
                          i === codes.length - 1 ? " edit-from-end" : ""
                        }`}
                        onClick={() => setPeek(p => (p === i ? null : i))}
                        onBlur={() => setPeek(null)}
                        aria-label={name}
                      >
                        {peek === i ? name : code}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {categories.map((c, row) => {
              const starts = row === 0 || categories[row - 1].group !== c.group;
              const icon = CATEGORY_ICONS[c.id];
              return (
                <tr key={c.id} className={starts ? "group-start" : ""}>
                  {starts && (
                    <th
                      rowSpan={
                        categories.filter(x => x.group === c.group).length
                      }
                      className="group-label hand-caps"
                    >
                      <span>{GROUP_LABELS[c.group]}</span>
                    </th>
                  )}
                  <th scope="row" className="row-label hand-caps">
                    {icon && <ScoreIcon name={icon} />}
                    <span>{c.label}</span>
                  </th>
                  {game.players.map((p, i) => (
                    <td key={i} className="past-cell">
                      {p.breakdown[c.id] ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="total-row">
              <th colSpan={2} scope="row" className="hand-caps">
                Total
              </th>
              {game.players.map((_, i) => (
                <td key={i}>
                  <Total game={game} col={i} />
                </td>
              ))}
            </tr>
            {tiebreak && (
              <tr className="tiebreak-row">
                <th colSpan={2} scope="row" className="row-label hand-caps">
                  <ScoreIcon name="food" />
                  <span>Unused food</span>
                </th>
                {game.players.map((p, i) => (
                  <td key={i} className="past-cell">
                    {p.unusedFood ?? "–"}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export const PastGames = ({
  history,
  onClose,
  onDelete,
  onPlayAgain,
  ask,
}: {
  history: SavedGame[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onPlayAgain: (game: SavedGame) => void;
  ask: Ask;
}) => {
  const [openId, setOpenId] = useState<string>();
  const open = history.find(g => g.id === openId);
  const drawerRef = useRef<HTMLElement>(null);

  // Move focus into the drawer, keep Tab inside it, and hand focus back to
  // whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current || dialogOpen()) return;
      const items = [
        ...drawerRef.current.querySelectorAll<HTMLElement>("button"),
      ];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      opener?.focus();
    };
  }, []);

  // Opening or leaving a slip swaps the drawer's contents; keep focus in it.
  useEffect(() => {
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [openId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dialogOpen()) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Keep the sheet behind the drawer from scrolling with it.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="past-games">
      <div className="past-dim" onClick={onClose} />
      <aside
        ref={drawerRef}
        className={`past-drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Past games"
      >
        <div className="past-head hand-caps">
          {open ? (
            <button type="button" onClick={() => setOpenId(undefined)}>
              ← Past games
            </button>
          ) : (
            <h2>Past games</h2>
          )}
          <button type="button" className="past-close" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {open ? (
          <article className="past-slip past-slip-full">
            <header className="hand-caps">
              <span>{formatDay(open.finishedAt)}</span>
              <span className="past-muted">{describeConfig(open.config)}</span>
            </header>
            <FullSheet game={open} />
            <p className="sheet-result">
              {open.summary}
              {open.detail && (
                <span className="sheet-result-detail">{open.detail}</span>
              )}
            </p>
            <div className="past-actions hand-caps">
              <button type="button" onClick={() => onPlayAgain(open)}>
                Play again with these players
              </button>
              <button
                type="button"
                className="past-muted"
                onClick={async () => {
                  const ok = await ask({
                    message: "Delete this game from Past games?",
                    confirm: "Delete",
                    danger: true,
                  });
                  if (ok) {
                    setOpenId(undefined);
                    onDelete(open.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ) : history.length === 0 ? (
          <p className="past-empty">
            Saved games will be torn off and kept here.
          </p>
        ) : (
          history.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className="past-slip"
              style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
              onClick={() => setOpenId(g.id)}
              aria-label={`${formatDay(g.finishedAt)}: ${g.summary}. Open full sheet`}
            >
              <header className="hand-caps">
                <span>{formatDay(g.finishedAt)}</span>
                <span className="past-muted">{describeConfig(g.config)}</span>
              </header>
              <div className="past-scores">
                {codesFor(g).map((code, col) => (
                  <div key={col}>
                    <span className="hand-caps">{code}</span>
                    <span className="past-total">
                      <Total game={g} col={col} />
                    </span>
                  </div>
                ))}
              </div>
              {g.detail && <p className="past-note">{g.detail}</p>}
            </button>
          ))
        )}
      </aside>
    </div>
  );
};
