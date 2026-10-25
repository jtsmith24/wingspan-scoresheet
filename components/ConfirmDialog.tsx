"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

export interface ConfirmOptions {
  message: string;
  confirm: string;
  cancel?: string;
  /** Destructive: Cancel gets focus, so a stray Enter does nothing harmful. */
  danger?: boolean;
}

export type Ask = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Themed stand-in for window.confirm. Render `dialog` once; `ask` resolves
 * true when the player confirms and false on Cancel, Escape or a tap outside.
 */
export function useConfirm(): [React.ReactNode, Ask] {
  const [request, setRequest] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const ask = useCallback<Ask>(
    options => new Promise(resolve => setRequest({ ...options, resolve })),
    []
  );
  const dialog = request && (
    <ConfirmDialog
      {...request}
      onDone={ok => {
        request.resolve(ok);
        setRequest(null);
      }}
    />
  );
  return [dialog, ask];
}

const ConfirmDialog = ({
  message,
  confirm,
  cancel = "Cancel",
  danger = false,
  onDone,
}: ConfirmOptions & { onDone: (ok: boolean) => void }) => {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal puts it above everything, traps focus and handles Escape.
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // close() hands focus back to whatever was focused before.
  const finish = (ok: boolean) => {
    ref.current?.close();
    onDone(ok);
  };

  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-describedby="app-dialog-message"
      onCancel={e => {
        e.preventDefault();
        finish(false);
      }}
      onClick={e => {
        if (e.target === ref.current) finish(false);
      }}
    >
      <div className="app-dialog-card">
        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>
        <div className="app-dialog-actions hand-caps">
          <button
            type="button"
            className="ink-button app-dialog-cancel"
            autoFocus={danger}
            onClick={() => finish(false)}
          >
            {cancel}
          </button>
          <button
            type="button"
            className="ink-button ink-button-primary app-dialog-confirm"
            autoFocus={!danger}
            onClick={() => finish(true)}
          >
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
};
