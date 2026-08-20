import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        id={inputId}
        className={cn(
          "min-h-11 rounded-xl border border-border bg-white px-3 py-2 text-foreground outline-none transition focus:border-brand",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
