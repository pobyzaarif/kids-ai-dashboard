export function EmptyState({
  icon = "🗂️",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 border-2 border-dashed border-ink bg-white/70 px-6 py-10 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="font-bold">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-gray-600">{hint}</p> : null}
      {action}
    </div>
  );
}
