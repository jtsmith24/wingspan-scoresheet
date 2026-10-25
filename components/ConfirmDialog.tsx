"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

export interface DialogAction {
  id: string;
  label: string;
  primary?: boolean;
}

export interface DialogOptions {
  message: string;
  actions: DialogAction[];
  /** e.g. "1 of 2" when a choice takes more than one step. */
  step?: string;
  /** Destructive: Cancel gets focus, so a stray Enter does nothing harmful. */
  danger?: boolean;
}

/** The id of the action picked, or null when cancelled. */
export type Choose = (options: DialogOptions) => Promise<string | null>;

export interface ConfirmOptions {
  message: string;
  confirm: string;
  danger?: boolean;
}
export type Ask = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Themed stand-in for window.confirm. Render `dialog` once. `choose` offers
 * a pair of answers with Cancel underneath; `ask` is the yes/no form.
 * Cancel, Escape and a tap outside all count as cancelling.
 */
export function useDialog(): [React.ReactNode, Choose, Ask] {
  const [request, setRequest] = useState<
    | (DialogOptions & { resolve: (choice: string | null) => void; id: number })
    | null
  >(null);
  const asked = useRef(0);
  const choose = useCallback<Choose>(
    options =>
      new Promise(resolve =>
        setRequest({ ...options, resolve, id: ++asked.current })
      ),
    []
  );
  const ask = useCallback<Ask>(
    async ({ message, confirm, danger }) =>
      (await choose({
        message,
        danger,
        actions: [{ id: "ok", label: confirm, primary: true }],
      })) !== null,
    [choose]
  );
  const dialog = request && (
    // Keyed per request: a follow-up question gets a fresh, open dialog
    // rather than reusing the one that just closed.
    <AppDialog
      key={request.id}
      {...request}
      onDone={choice => {
        request.resolve(choice);
        setRequest(null);
      }}
    />
  );
  return [dialog, choose, ask];
}

const AppDialog = ({
  message,
  actions,
  step,
  danger = false,
  onDone,
}: DialogOptions & { onDone: (choice: string | null) => void }) => {
  const ref = useRef<HTMLDialogElement>(null);
  // A pair of answers sits side by side with Cancel as a link below;
  // a single confirmation keeps Cancel as its partner button.
  const pair = actions.length > 1;

  // showModal puts it above everything, traps focus and handles Escape. It
  // focuses the first control itself, so pick the intended button after.
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>(
        danger ? ".app-dialog-cancel" : ".app-dialog-confirm"
      )
      ?.focus();
  }, [danger]);

  // close() hands focus back to whatever was focused before.
  const finish = (choice: string | null) => {
    ref.current?.close();
    onDone(choice);
  };

  const cancel = (
    <button
      type="button"
      className={
        pair ? "text-link app-dialog-cancel" : "ink-button app-dialog-cancel"
      }
      onClick={() => finish(null)}
    >
      Cancel
    </button>
  );

  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-describedby="app-dialog-message"
      onCancel={e => {
        e.preventDefault();
        finish(null);
      }}
      onClick={e => {
        if (e.target === ref.current) finish(null);
      }}
    >
      <div className="app-dialog-card">
        {step && <p className="app-dialog-step hand-caps">{step}</p>}
        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>
        <div
          className={`app-dialog-actions hand-caps${pair ? " is-pair" : ""}`}
        >
          {!pair && cancel}
          {actions.map(a => (
            <button
              key={a.id}
              type="button"
              className={`ink-button app-dialog-action${
                a.primary ? " ink-button-primary app-dialog-confirm" : ""
              }`}
              data-action={a.id}
              onClick={() => finish(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
        {pair && <div className="app-dialog-under hand-caps">{cancel}</div>}
      </div>
    </dialog>
  );
};
