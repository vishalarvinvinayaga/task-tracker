export function TicketBadge({ ticketId, ticketUrl }: { ticketId: string; ticketUrl?: string | null }) {
  const content = (
    <span className="inline-flex items-center rounded border border-gray-300 px-1.5 py-0.5 text-[11px] font-mono text-gray-600 dark:border-gray-600 dark:text-gray-300">
      {ticketId}
    </span>
  );
  if (!ticketUrl) return content;
  return (
    <a href={ticketUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {content}
    </a>
  );
}
