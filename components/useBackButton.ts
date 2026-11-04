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

interface Layer {
  back: () => void;
  /** Closed by back, and on its way out. */
  closed: boolean;
}

// Open layers, innermost last.
const layers: Layer[] = [];
// The depth a step back of our own is on its way to, if one is.
let stepping: number | undefined;
let queued: ReturnType<typeof setTimeout> | undefined;
let listening = false;

/** How many of our entries the history is standing on. */
const depth = (): number => {
  const entry = window.history.state?.[ENTRY];
  return entry?.depth ?? 0;
};

/** Push an entry for each layer that opened, or step back off closed ones. */
function sync() {
  if (stepping !== undefined) return;
  const at = depth();
  const open = layers.filter(l => !l.closed).length;
  if (at > open) {
    stepping = open;
    window.history.go(open - at);
  }
  for (let d = at + 1; d <= open; d++)
    window.history.pushState({ [ENTRY]: { depth: d } }, "");
}

// After the current render, so a layer that closes and opens again at once
// (React's dev double effects, a follow-up question) keeps its entry.
const queueSync = () => {
  clearTimeout(queued);
  queued = setTimeout(sync);
};

function onPopState() {
  // Our own step, unless it landed somewhere else: then the browser dropped
  // it for a back press of the user's, handled as one below.
  const ours = stepping !== undefined && depth() === stepping;
  stepping = undefined;
  if (ours) {
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
