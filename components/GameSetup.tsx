"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AsiaMode, GameConfig, hummingbirdsInPlay } from "@/lib/rules";
import { Edition } from "@/lib/theme";

export type Expansion = Exclude<Edition, "base">;

const EXPANSIONS: { id: Expansion; label: string; short: string }[] = [
  { id: "european", label: "European", short: "Eur" },
  { id: "oceania", label: "Oceania", short: "Oce" },
  { id: "asia", label: "Asia", short: "Asia" },
  { id: "americas", label: "Americas", short: "Am" },
];

const ASIA_MODES: { id: AsiaMode; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "duet", label: "Duet" },
  { id: "flock", label: "Flock" },
];

const isOn = (config: GameConfig, id: Expansion) =>
  id === "asia" ? config.asia !== "off" : config[id];

/** Closes a popover on Escape or a press anywhere outside `refs`. */
function useDismiss(
  refs: React.RefObject<HTMLElement | null>[],
  open: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent | KeyboardEvent) => {
      // A question it raised (say, trimming players) answers in a dialog
      // on top; answering it shouldn't close the popover underneath.
      if (document.querySelector("dialog[open]")) return;
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !refs.some(r => r.current?.contains(e.target as Node))
      )
        close();
    };
    document.addEventListener("pointerdown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("pointerdown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [refs, open, close]);
}

const AsiaModeSelect = ({
  mode,
  onChange,
}: {
  mode: AsiaMode;
  onChange: (mode: AsiaMode) => void;
}) => (
  <span className="mode-select">
    <select
      value={mode}
      onChange={e => onChange(e.target.value as AsiaMode)}
      aria-label="Asia mode"
    >
      {ASIA_MODES.map(m => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  </span>
);

/** "European + Oceania"; Asia names its mode unless it's Standard. */
function expansionNames(config: GameConfig, short: boolean) {
  return EXPANSIONS.filter(e => isOn(config, e.id))
    .map(e => {
      const name = short ? e.short : e.label;
      return e.id === "asia" && config.asia !== "standard"
        ? `${name} · ${ASIA_MODES.find(m => m.id === config.asia)?.label}`
        : name;
    })
    .join(" + ");
}

/**
 * Two tabs along the top of the sheet: Base, and Expansions, which names
 * the boxes in play and opens a checklist to pick one or several. Base is
 * the raised tab only when no expansion is ticked.
 */
export const ExpansionTabs = ({
  config,
  palette,
  onToggle,
  onAsiaMode,
  onBase,
}: {
  config: GameConfig;
  /** The palettes the page is coloured by; the Expansions tab matches them. */
  palette: Edition[];
  onToggle: (expansion: Expansion) => void;
  onAsiaMode: (mode: AsiaMode) => void;
  onBase: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const tabRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Tapping Base counts as outside, so it closes the checklist too.
  useDismiss([tabRef, popoverRef], open, () => setOpen(false));

  const rowRef = useRef<HTMLDivElement>(null);
  // Measure with full names; switch to short ones only if they overflow.
  // A data attribute, so React's className updates don't clear it.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const fit = () => {
      delete row.dataset.tight;
      if (row.scrollWidth > row.clientWidth) row.dataset.tight = "";
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [config]);

  const any = EXPANSIONS.some(e => isOn(config, e.id));
  const names = expansionNames(config, false);

  // The checklist sits outside the tab row: tucked tabs are transformed,
  // which would trap it underneath the sheet.
  return (
    <div className="expansion-tabs-wrap hand-caps">
      <div
        ref={rowRef}
        className="expansion-tabs"
        role="group"
        aria-label="Game"
      >
        <div className={`expansion-tab tab-base${any ? "" : " is-on"}`}>
          <button type="button" aria-pressed={!any} onClick={() => {
              setOpen(false);
              onBase();
            }}>
            Base
          </button>
        </div>
        <div
          ref={tabRef}
          className={`expansion-tab tab-${
            !any ? "mix" : palette.length > 1 ? "blend" : palette[0]
          }${any ? " is-on" : ""}`}
          style={
            palette.length > 1
              ? ({
                  "--blend": `linear-gradient(90deg, ${palette
                    .map(e => `var(--${e}-1)`)
                    .join(", ")})`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <button
            type="button"
            aria-expanded={open}
            aria-label={any ? `Expansions: ${names}` : "Expansions"}
            onClick={() => {
              setLeft(tabRef.current?.offsetLeft ?? 0);
              setOpen(o => !o);
            }}
          >
            {any ? (
              <>
                <span className="tab-long">{names}</span>
                <span className="tab-short">
                  {expansionNames(config, true)}
                </span>
              </>
            ) : (
              "Expansions"
            )}
            <span className="tab-caret" aria-hidden="true">
              {open ? "▴" : "▾"}
            </span>
          </button>
        </div>
      </div>
      {open && (
        <div ref={popoverRef} className="mix-popover" style={{ left }}>
          <p className="mix-hint">Which expansions are you playing?</p>
          {EXPANSIONS.map(e => {
            // Americas in Flock mode: its birds play, its hummingbirds don't.
            const note =
              e.id === "americas" &&
              config.americas &&
              !hummingbirdsInPlay(config)
                ? "No hummingbird track with 6–7 players (Flock). Americas birds still play."
                : null;
            return (
              <div key={e.id} className="mix-row">
                <label className="mix-option">
                  <input
                    type="checkbox"
                    checked={isOn(config, e.id)}
                    onChange={() => onToggle(e.id)}
                    aria-describedby={note ? "mix-note-americas" : undefined}
                  />
                  <span className={`mix-swatch tab-${e.id}`} />
                  {e.label}
                </label>
                {e.id === "asia" && isOn(config, "asia") && (
                  <AsiaModeSelect mode={config.asia} onChange={onAsiaMode} />
                )}
                {note && (
                  <p id="mix-note-americas" className="mix-note">
                    {note}
                  </p>
                )}
              </div>
            );
          })}
          <div className="mix-footer">
            {EXPANSIONS.some(e => isOn(config, e.id)) && (
              <button type="button" className="text-link" onClick={onBase}>
                Clear
              </button>
            )}
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
  );
};
