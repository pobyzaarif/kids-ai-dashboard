import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "yellow" | "lime" | "pink" | "cyan" | "orange" | "red" | "purple" | "white";

const toneClasses: Record<Tone, string> = {
  yellow: "bg-brand-yellow",
  lime: "bg-brand-lime",
  pink: "bg-brand-pink",
  cyan: "bg-brand-cyan",
  orange: "bg-brand-orange",
  red: "bg-brand-red text-white",
  purple: "bg-brand-purple",
  white: "bg-white",
};

export function Badge({
  tone = "white",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-ink px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
