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
  cancel?: string;
  /** Destructive: Cancel gets focus, so a stray Enter does nothing harmful. */
  danger?: boolean;
  checkboxes?: { id: string; label: string; checked: boolean }[];
}

/** The action picked and each checkbox's state, or null when cancelled. */
export type Choice = {
  action: string;
  checked: Record<string, boolean>;
} | null;
export type Choose = (options: DialogOptions) => Promise<Choice>;

export interface ConfirmOptions {
  message: string;
  confirm: string;
  danger?: boolean;
}
export type Ask = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Themed stand-in for window.confirm. Render `dialog` once. `choose` offers
 * several actions (and optionally checkboxes); `ask` is the yes/no form.
 * Cancel, Escape and a tap outside all count as cancelling.
 */
export function useDialog(): [React.ReactNode, Choose, Ask] {
  const [request, setRequest] = useState<
    (DialogOptions & { resolve: (choice: Choice) => void }) | null
  >(null);
  const choose = useCallback<Choose>(
    options => new Promise(resolve => setRequest({ ...options, resolve })),
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
    <AppDialog
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
  cancel = "Cancel",
  danger = false,
  checkboxes = [],
  onDone,
}: DialogOptions & { onDone: (choice: Choice) => void }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checkboxes.map(c => [c.id, c.checked]))
  );

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
  const finish = (action: string | null) => {
    ref.current?.close();
    onDone(action === null ? null : { action, checked });
  };

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
        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>
        {checkboxes.map(c => (
          <label key={c.id} className="app-dialog-check">
            <input
              type="checkbox"
              data-check={c.id}
              checked={checked[c.id]}
              onChange={e =>
                setChecked(now => ({ ...now, [c.id]: e.target.checked }))
              }
            />
            {c.label}
          </label>
        ))}
        <div className="app-dialog-actions hand-caps">
          <button
            type="button"
            className="ink-button app-dialog-cancel"
            onClick={() => finish(null)}
          >
            {cancel}
          </button>
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
      </div>
    </dialog>
  );
};
