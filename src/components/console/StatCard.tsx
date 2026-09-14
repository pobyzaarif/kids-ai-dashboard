export function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`border-2 border-ink p-4 shadow-brutal ${tone}`}>
      <p className="text-3xl" aria-hidden>
        {icon}
      </p>
      <p className="mt-2 text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
    </div>
  );
}
