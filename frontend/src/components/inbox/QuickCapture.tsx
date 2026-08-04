import { useState } from "react";
import { inboxApi } from "../../api/inbox";
import { useToast } from "../../hooks/useToast";

export function QuickCapture({ onCaptured, autoFocus }: { onCaptured?: () => void; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await inboxApi.capture(value.trim());
      setValue("");
      onCaptured?.();
      toast.show("Captured to inbox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Quick capture — type anything, hit enter…"
        disabled={busy}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        onClick={submit}
        disabled={busy || !value.trim()}
        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
      >
        Capture
      </button>
    </div>
  );
}
