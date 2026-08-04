export function Header({ title }: { title: string }) {
  return (
    <header className="glass-panel sticky top-0 z-10 flex items-center justify-between border-x-0 border-t-0 px-6 py-4">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
