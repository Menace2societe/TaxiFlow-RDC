import { cn } from "@/lib/utils/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
};

const variants = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
  info: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex w-fit items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold", variants[variant], className)}
      {...props}
    />
  );
}
