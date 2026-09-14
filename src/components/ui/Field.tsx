import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-bold uppercase tracking-wide"
    >
      {children}
    </label>
  );
}

const controlClasses =
  "w-full border-2 border-ink bg-white px-3 py-2 text-sm font-medium shadow-brutal-xs placeholder:text-gray-400 focus:shadow-brutal-sm focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-24", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}
