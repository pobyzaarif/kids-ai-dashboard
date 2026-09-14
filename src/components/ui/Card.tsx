import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("border-2 border-ink bg-white shadow-brutal", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-brand-yellow px-4 py-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle ? <p className="text-xs font-medium opacity-70">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
