import { useState } from "react";
import { Modal } from "./Modal";

/**
 * Confirmation for destructive actions. `confirmText` demands the user type
 * the name back — reserved for deletes that take other records down with them.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  confirmText,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const locked = confirmText ? typed.trim() !== confirmText : false;

  async function run() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4">
        <div className="text-sm text-[var(--hud-text-dim)]">{body}</div>

        {confirmText && (
          <div>
            <label className="hud-label mb-1.5 block">
              Type <span style={{ color: "var(--accent-via)" }}>{confirmText}</span> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !locked && run()}
              className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={run}
            disabled={locked || busy}
            className="btn-ghost px-4 py-2 text-sm font-semibold uppercase tracking-wider text-rose-400 disabled:opacity-40"
            style={{ borderColor: "rgba(244,63,94,0.5)" }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
