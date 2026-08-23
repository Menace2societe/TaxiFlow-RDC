import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="card p-5 text-stone-100 stat-glow-emerald">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-neutral-400">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-white">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-neutral-400">{helper}</p>
    </div>
  );
}
