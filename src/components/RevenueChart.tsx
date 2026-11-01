"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

type RevenueChartProps = {
  data: Array<{ date: string; revenue: number; costs: number }>;
};

/*
 * Deux habillages : l'univers « plaque » (clair) en classes de base, l'ancien look sombre de
 * l'espace admin sous `dark:` (qui ne s'applique jamais dans .plate-world). Les attributs SVG
 * gardent les valeurs sombres ; les classes CSS, prioritaires, posent l'encre et les filets clairs.
 */
const chartFrame = [
  "text-plate-ink dark:text-[#94a3b8]",
  "[&_.recharts-cartesian-grid_line]:stroke-plate-rule [&_.recharts-cartesian-grid_line]:[stroke-dasharray:none]",
  "dark:[&_.recharts-cartesian-grid_line]:stroke-[rgba(148,163,184,0.12)] dark:[&_.recharts-cartesian-grid_line]:[stroke-dasharray:3_3]",
  "[&_.recharts-tooltip-cursor]:fill-plate-ink/[0.06] dark:[&_.recharts-tooltip-cursor]:fill-[rgba(16,185,129,0.08)]"
].join(" ");

const revenueBarClass = "[&_.recharts-rectangle]:fill-plate-ink dark:[&_.recharts-rectangle]:fill-[url(#revenueBars)]";
const costBarClass = [
  "[&_.recharts-rectangle]:fill-plate-rule [&_.recharts-rectangle]:stroke-plate-soft [&_.recharts-rectangle]:[stroke-width:1.5]",
  "dark:[&_.recharts-rectangle]:fill-[url(#costBars)] dark:[&_.recharts-rectangle]:[stroke:none]"
].join(" ");

const swatches: Record<string, string> = {
  Recettes: "bg-plate-ink dark:bg-emerald-400",
  Coûts: "border-2 border-plate-soft bg-plate-rule dark:border-0 dark:bg-amber-500"
};

function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border-2 border-plate-ink bg-plate-white px-3 py-2 dark:rounded-xl dark:border dark:border-neutral-700 dark:bg-neutral-950/95 dark:shadow-xl dark:backdrop-blur-sm">
      <p className="text-[14px] font-semibold text-plate-ink dark:text-[11px] dark:uppercase dark:text-neutral-400">{label}</p>
      <div className="mt-1 space-y-1 dark:mt-2">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-[15px] dark:text-xs">
            <span className="inline-flex items-center gap-1.5 text-plate-ink dark:text-neutral-300">
              <span className={`h-3 w-3 rounded-sm dark:h-2 dark:w-2 dark:rounded-full ${swatches[item.name ?? ""] ?? ""}`} />
              {item.name}
            </span>
            <span className="font-plate text-[18px] font-bold text-plate-ink dark:[font-family:inherit] dark:text-xs dark:font-semibold dark:text-white">
              {formatCDF(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className={chartFrame}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="costBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#b45309" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "currentColor" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "currentColor" }}
            tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(16,185,129,0.08)" }} isAnimationActive={false} />
          <Bar
            dataKey="revenue"
            name="Recettes"
            className={revenueBarClass}
            fill="url(#revenueBars)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
          <Bar
            dataKey="costs"
            name="Coûts"
            className={costBarClass}
            fill="url(#costBars)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-semibold text-plate-ink dark:hidden">
        <span className="inline-flex items-center gap-2">
          <span className={`h-3.5 w-3.5 rounded-sm ${swatches.Recettes}`} aria-hidden />
          Recettes
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-3.5 w-3.5 rounded-sm ${swatches["Coûts"]}`} aria-hidden />
          Coûts (carburant, entretien)
        </span>
      </p>
    </div>
  );
}
