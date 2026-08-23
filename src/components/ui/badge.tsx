import { cn } from "@/lib/utils/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
};

const variants = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  neutral: "border-neutral-700 bg-neutral-800/70 text-neutral-300",
  info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-center text-xs font-semibold leading-tight", variants[variant], className)}
      {...props}
    />
  );
}
