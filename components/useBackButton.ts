import { useEffect, useRef } from "react";

/** Marks the history entry an open panel sits on. */
const ENTRY = "panel";

const onEntry = () => !!window.history.state?.[ENTRY];
// Next.js copies its own state onto the entry, so this one's kept beside it.
const enter = () => window.history.pushState({ [ENTRY]: true }, "");

// The open panel's back handler; false keeps it open.
let current: (() => boolean | void) | undefined;
// A step back off the entry is on its way, after closing some other way.
let leaving = false;
let stepBack: ReturnType<typeof setTimeout> | undefined;
let listening = false;

const onPopState = () => {
  if (leaving) {
    // Our own step back: if the panel reopened meanwhile, it gets its entry now.
    leaving = false;
    if (current && !onEntry()) enter();
  } else if (current && !onEntry() && current() === false) {
    enter();
  }
};

/**
 * The phone's back button goes to a panel instead of leaving the app: the
 * panel opens on a history entry of its own, which closing it any other way
 * takes back off. `onBack` returns false to stay open (the entry goes back
 * on). For one panel at a time.
 */
export function useBackButton(onBack: () => boolean | void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    // A remount straight after unmounting (React's dev double effects)
    // keeps the entry. So does a reload with the panel open: the entry
    // stays behind, and opening again reuses it.
    clearTimeout(stepBack);
    current = () => onBackRef.current();
    if (!onEntry() && !leaving) enter();
    return () => {
      current = undefined;
      stepBack = setTimeout(() => {
        if (!onEntry()) return;
        leaving = true;
        window.history.back();
      });
    };
  }, []);
}
