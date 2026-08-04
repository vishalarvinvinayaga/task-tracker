import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { QuickCapture } from "../components/inbox/QuickCapture";
import { InboxItem } from "../components/inbox/InboxItem";
import { inboxApi, type InboxItem as InboxItemType } from "../api/inbox";

export function Inbox() {
  const [unresolved, setUnresolved] = useState<InboxItemType[]>([]);
  const [resolved, setResolved] = useState<InboxItemType[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  function load() {
    inboxApi.list(false).then(setUnresolved);
    inboxApi.list(true).then((all) => setResolved(all.filter((i) => i.resolved_to)));
  }

  useEffect(load, []);

  return (
    <>
      <Header title="Inbox" />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <QuickCapture onCaptured={load} autoFocus />

        <div className="space-y-2">
          {unresolved.length === 0 && <p className="text-sm text-gray-400">Inbox zero. Nice.</p>}
          {unresolved.map((item) => (
            <InboxItem key={item.id} item={item} onResolved={load} />
          ))}
        </div>

        {resolved.length > 0 && (
          <div>
            <button onClick={() => setShowResolved((s) => !s)} className="text-xs font-medium text-gray-400 hover:underline">
              {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
            </button>
            {showResolved && (
              <div className="mt-2 space-y-1">
                {resolved.map((item) => (
                  <div key={item.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-400 dark:bg-gray-900">
                    {item.content} <span className="text-xs">→ {item.resolved_to}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
