import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-stone-950 p-5 text-stone-100 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-300">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <span className="rounded-md bg-emerald-500/10 p-2 text-emerald-300">
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-400">{helper}</p>
    </div>
  );
}
