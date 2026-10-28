"use client";
import React, { useEffect, useRef, useState } from "react";
import { Ask } from "./ConfirmDialog";
import { SavedStamp } from "./SavedStamp";
import { ScoreIcon } from "./ScoreIcon";
import SumTable, { CATEGORY_ICONS, sheetTitle } from "./sum-table/SumTable";
import { playerHasData, SavedGame } from "@/lib/game";
import { withCodes } from "@/lib/names";
import { categoriesFor, describeConfig, GROUP_LABELS } from "@/lib/rules";
import { PlayerSheet } from "@/lib/scoring";

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

/** Date and edition across the top of a slip, with ▾/▴ for open or not. */
const SlipHead = ({ game, open }: { game: SavedGame; open: boolean }) => (
  <>
    <span>{formatDay(game.finishedAt)}</span>
    <span className="past-head-end">
      <span className="past-muted">{describeConfig(game.config)}</span>
      <span className="past-chevron" aria-hidden="true">
        {open ? "▴" : "▾"}
      </span>
    </span>
  </>
);

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
  initialOpen,
  onClose,
  onDelete,
  onEdit,
  onPlayAgain,
  ask,
}: {
  history: SavedGame[];
  /** A game to open straight away. */
  initialOpen?: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, players: PlayerSheet[]) => void;
  onPlayAgain: (game: SavedGame) => void;
  ask: Ask;
}) => {
  const [openId, setOpenId] = useState(initialOpen);
  // The open game's sheet while it's being edited.
  const [draft, setDraft] = useState<PlayerSheet[]>();
  // Bumped each time an edit is saved, to replay the stamp.
  const [stamp, setStamp] = useState(0);
  const open = history.find(g => g.id === openId);
  const fold = () => {
    setDraft(undefined);
    setStamp(0);
    setOpenId(undefined);
  };
  const drawerRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string>(undefined);

  // Move focus into the drawer, keep Tab inside it, and hand focus back to
  // whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current || dialogOpen()) return;
      const items = [
        ...drawerRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)"
        ),
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

  // Opening or leaving a slip swaps the drawer's contents: focus the open
  // slip's header, or on the way back, the slip that was open.
  useEffect(() => {
    const drawer = drawerRef.current;
    if (openId) lastOpened.current = openId;
    else if (!lastOpened.current) return;
    (
      drawer?.querySelector<HTMLElement>(
        openId
          ? ".past-slip-toggle"
          : `[data-id="${CSS.escape(lastOpened.current ?? "")}"]`
      ) ?? drawer?.querySelector<HTMLElement>("button")
    )?.focus();
  }, [openId]);

  // Escape leaves an edit first, then the drawer.
  const editing = !!draft;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || dialogOpen()) return;
      if (editing) setDraft(undefined);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    // Keep the sheet behind the drawer from scrolling with it.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, editing]);

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
          <h2>Past games</h2>
          <button type="button" className="past-close" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {open ? (
          // Tapping the open sheet anywhere but its buttons folds it back up,
          // unless it's being edited.
          <article
            className={`past-slip past-slip-full${draft ? " is-editing" : ""}`}
            onClick={e => {
              if (!draft && !(e.target as Element).closest("button")) fold();
            }}
          >
            <button
              type="button"
              className="past-slip-toggle hand-caps"
              aria-expanded="true"
              aria-label={`${formatDay(open.finishedAt)}. Close full sheet`}
              onClick={fold}
            >
              <SlipHead game={open} open />
            </button>
            {stamp > 0 && (
              <SavedStamp key={stamp} onDone={() => setStamp(0)} />
            )}
            {draft ? (
              <>
                <SumTable
                  game={{ config: open.config, players: draft }}
                  onPlayersChange={setDraft}
                  idPrefix="past-"
                />
                <div className="past-edit-actions hand-caps">
                  <button
                    type="button"
                    className="ink-button"
                    onClick={() => setDraft(undefined)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ink-button ink-button-primary"
                    disabled={!draft.some(p => playerHasData(p, open.config))}
                    onClick={() => {
                      onEdit(open.id, draft);
                      setDraft(undefined);
                      setStamp(s => s + 1);
                    }}
                  >
                    Save changes
                  </button>
                </div>
              </>
            ) : (
              <>
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
                  <button type="button" onClick={() => setDraft(open.sheet)}>
                    Edit
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
                        fold();
                        onDelete(open.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ) : (
          history.map((g, i) => (
            <button
              key={g.id}
              data-id={g.id}
              type="button"
              className="past-slip"
              style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
              onClick={() => setOpenId(g.id)}
              aria-label={`${formatDay(g.finishedAt)}: ${g.summary}. Open full sheet`}
            >
              <header className="hand-caps">
                <SlipHead game={g} open={false} />
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
