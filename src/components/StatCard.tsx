import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <span className="rounded-md bg-palm/10 p-2 text-palm">
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-500">{helper}</p>
    </div>
  );
}
