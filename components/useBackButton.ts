import { useEffect, useRef } from "react";

// The open panel's history entry, kept here so it outlives remounts.
let onEntry = false;
// A step back off the entry is on its way, after closing some other way.
let leaving = false;
let close: (() => void) | undefined;
let stepBack: ReturnType<typeof setTimeout> | undefined;
let listening = false;

const enter = () => {
  window.history.pushState({}, "");
  onEntry = true;
};

const onPopState = () => {
  if (leaving) {
    // Our own step back: if the panel reopened meanwhile, it gets its entry now.
    leaving = false;
    if (close) enter();
  } else if (onEntry) {
    onEntry = false;
    close?.();
  }
};

/**
 * The phone's back button closes a panel instead of leaving the app: the
 * panel opens on a history entry of its own, which closing it any other way
 * takes back off. For one panel at a time.
 */
export function useBackButton(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    // A remount straight after unmounting (React's dev double effects)
    // keeps the entry it already has.
    clearTimeout(stepBack);
    close = () => onCloseRef.current();
    if (!onEntry && !leaving) enter();
    return () => {
      close = undefined;
      stepBack = setTimeout(() => {
        if (!onEntry) return;
        onEntry = false;
        leaving = true;
        window.history.back();
      });
    };
  }, []);
}
