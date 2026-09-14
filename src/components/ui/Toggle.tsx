"use client";

import { cn } from "@/lib/cn";

/** Neobrutalist switch. Fully controlled. */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-14 shrink-0 border-2 border-ink transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-brand-lime" : "bg-white",
      )}
    >
      <span
        className={cn(
          "absolute top-0 h-full w-6 border-r-2 border-ink bg-ink transition-all",
          checked ? "left-[calc(100%-1.5rem)] border-l-2 border-r-0" : "left-0",
        )}
      />
    </button>
  );
}
