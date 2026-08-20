import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-brand text-white hover:bg-brand-light disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "border border-border bg-white text-foreground hover:bg-background disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "border border-danger/20 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-60 disabled:cursor-not-allowed",
} as const;

type ButtonProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
