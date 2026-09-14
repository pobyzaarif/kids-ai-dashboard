"use client";

import { cn } from "@/lib/cn";

export type TabItem = { key: string; label: string; badge?: number };

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-3">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "cursor-pointer border-2 border-ink px-4 py-2 text-sm font-bold transition-all",
            active === item.key
              ? "translate-x-0.5 translate-y-0.5 bg-brand-yellow shadow-none"
              : "bg-white shadow-brutal-sm hover:bg-[#f4f1e8]",
          )}
        >
          {item.label}
          {typeof item.badge === "number" ? (
            <span className="ml-2 border border-ink bg-white px-1 text-[11px]">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
