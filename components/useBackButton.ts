import { useEffect, useRef } from "react";

/*
 * The phone's back button closes what's open instead of leaving the app.
 * Each open layer (the Past games drawer, an edit in it, a question) has a
 * history entry of its own, pushed as it opens; back closes the layers above
 * the entry it lands on, and closing one any other way steps back off its
 * entry. Entries are only ever pushed as something opens, never on the way
 * back: Chrome skips entries a page adds without a tap, so pushing one back
 * after a back press would make the next press leave the app.
 */

const ENTRY = "layers";
// Entries from before a reload belong to the old page: stepping back across
// them would load the app again, so they don't count as ours.
const PAGE = Math.random();

interface Layer {
  back: () => void;
  /** Closed by back, and on its way out. */
  closed: boolean;
}

// Open layers, innermost last.
const layers: Layer[] = [];
// A step back of our own is on its way.
let stepping = false;
let queued: ReturnType<typeof setTimeout> | undefined;
let listening = false;

/** How many of our entries the history is standing on. */
const depth = (): number => {
  const entry = window.history.state?.[ENTRY];
  return entry?.page === PAGE ? entry.depth : 0;
};

/** Push an entry for each layer that opened, or step back off closed ones. */
function sync() {
  if (stepping) return;
  const at = depth();
  const open = layers.filter(l => !l.closed).length;
  if (at > open) {
    stepping = true;
    window.history.go(open - at);
  }
  for (let d = at + 1; d <= open; d++)
    window.history.pushState({ [ENTRY]: { page: PAGE, depth: d } }, "");
}

// After the current render, so a layer that closes and opens again at once
// (React's dev double effects, a follow-up question) keeps its entry.
const queueSync = () => {
  clearTimeout(queued);
  queued = setTimeout(sync);
};

function onPopState() {
  if (stepping) {
    stepping = false;
    sync();
    return;
  }
  // Back past some layers closes them, innermost first.
  const open = layers.filter(l => !l.closed);
  for (const layer of open.slice(depth()).reverse()) {
    layer.closed = true;
    layer.back();
  }
  // Forward onto an entry nothing holds steps back off it.
  queueSync();
}

/** While `open`, the back button calls `onBack`, which must close the layer. */
export function useBackButton(onBack: () => void, open = true) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    const layer: Layer = { back: () => onBackRef.current(), closed: false };
    layers.push(layer);
    queueSync();
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      queueSync();
    };
  }, [open]);
}
