"use client";
import React, { useEffect, useRef, useState } from "react";
import { AsiaMode, GameConfig } from "@/lib/rules";
import { Edition } from "@/lib/theme";

export type Expansion = Exclude<Edition, "base">;

const EXPANSIONS: { id: Expansion; label: string; short: string }[] = [
  { id: "european", label: "European", short: "Eur" },
  { id: "oceania", label: "Oceania", short: "Oce" },
  { id: "asia", label: "Asia", short: "Asia" },
  { id: "americas", label: "Americas", short: "Am" },
];

/** Full label, shortened on phones unless the tab is selected. */
const TabLabel = ({ label, short }: { label: string; short: string }) => (
  <>
    <span className="tab-long">{label}</span>
    <span className="tab-short" aria-hidden="true">
      {short}
    </span>
  </>
);

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

/**
 * Tabs along the top of the sheet. Each tab picks one box (base
 * game plus that expansion); "Mix" combines expansions whose cards are
 * shuffled together. Players are added from the sheet itself.
 */
export const ExpansionTabs = ({
  config,
  onToggle,
  onAsiaMode,
  onSelectOnly,
}: {
  config: GameConfig;
  onToggle: (expansion: Expansion) => void;
  onAsiaMode: (mode: AsiaMode) => void;
  onSelectOnly: (edition: Edition) => void;
}) => {
  const [mixOpen, setMixOpen] = useState(false);
  const [mixLeft, setMixLeft] = useState(0);
  const mixTabRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Clicking another tab counts as outside, so it closes the checklist too.
  useDismiss([mixTabRef, popoverRef], mixOpen, () => setMixOpen(false));

  const active = EXPANSIONS.filter(e => isOn(config, e.id));
  const mixed = active.length > 1;

  // The checklist sits outside the tab row: tucked tabs are transformed,
  // which would trap it underneath the sheet.
  return (
    <div className="expansion-tabs-wrap hand-caps">
      <div
        className={`expansion-tabs${mixed ? " is-mixed" : ""}`}
        role="group"
        aria-label="Game"
      >
        <div
          className={`expansion-tab tab-base${active.length === 0 ? " is-on" : ""}`}
        >
          <button
            type="button"
            aria-pressed={active.length === 0}
            onClick={() => onSelectOnly("base")}
          >
            Base
          </button>
        </div>
        {EXPANSIONS.map(e => {
          const on = isOn(config, e.id);
          return (
            <div
              key={e.id}
              className={`expansion-tab tab-${e.id}${on ? " is-on" : ""}`}
            >
              <button
                type="button"
                aria-pressed={on}
                aria-label={e.label}
                onClick={() => onSelectOnly(e.id)}
              >
                <TabLabel label={e.label} short={e.short} />
              </button>
              {e.id === "asia" && on && (
                <AsiaModeSelect mode={config.asia} onChange={onAsiaMode} />
              )}
            </div>
          );
        })}
        <div
          ref={mixTabRef}
          className={`expansion-tab tab-mix${mixed ? " is-on" : ""}`}
        >
          <button
            type="button"
            aria-expanded={mixOpen}
            onClick={() => {
              setMixLeft(mixTabRef.current?.offsetLeft ?? 0);
              setMixOpen(o => !o);
            }}
          >
            {mixed ? `Mix · ${active.length}` : "Mix"}
          </button>
        </div>
      </div>
      {mixOpen && (
        <div ref={popoverRef} className="mix-popover" style={{ left: mixLeft }}>
          <p className="mix-hint">Shuffling expansions together?</p>
          {EXPANSIONS.map(e => (
            <label key={e.id} className="mix-option">
              <input
                type="checkbox"
                checked={isOn(config, e.id)}
                onChange={() => onToggle(e.id)}
              />
              <span className={`mix-swatch tab-${e.id}`} />
              {e.label}
            </label>
          ))}
          <button
            type="button"
            className="text-link mix-clear"
            onClick={() => onSelectOnly("base")}
            disabled={active.length === 0}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
