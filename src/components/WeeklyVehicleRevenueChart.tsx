"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

// Attributs SVG = ancien look sombre (espace admin). Dans l'univers « plaque », les classes CSS
// (prioritaires) posent des encres sans bleu ni dégradé ; `dark:` les retire pour l'admin.
const colors = ["#10b981", "#38bdf8", "#f59e0b", "#818cf8", "#f43f5e"];
const plateBarClasses = [
  "[&_.recharts-rectangle]:fill-plate-ink",
  "[&_.recharts-rectangle]:fill-plate-soft",
  "[&_.recharts-rectangle]:fill-plate-white [&_.recharts-rectangle]:stroke-plate-ink [&_.recharts-rectangle]:[stroke-width:2]",
  "[&_.recharts-rectangle]:fill-plate-rule [&_.recharts-rectangle]:stroke-plate-soft [&_.recharts-rectangle]:[stroke-width:1.5]",
  "[&_.recharts-rectangle]:fill-[#7a7a72]"
];
const darkBarClasses = [
  "dark:[&_.recharts-rectangle]:fill-[#10b981]",
  "dark:[&_.recharts-rectangle]:fill-[#38bdf8]",
  "dark:[&_.recharts-rectangle]:fill-[#f59e0b] dark:[&_.recharts-rectangle]:[stroke:none]",
  "dark:[&_.recharts-rectangle]:fill-[#818cf8] dark:[&_.recharts-rectangle]:[stroke:none]",
  "dark:[&_.recharts-rectangle]:fill-[#f43f5e]"
];
const swatchClasses = [
  "bg-plate-ink dark:bg-[#10b981]",
  "bg-plate-soft dark:bg-[#38bdf8]",
  "border-2 border-plate-ink bg-plate-white dark:border-0 dark:bg-[#f59e0b]",
  "border-2 border-plate-soft bg-plate-rule dark:border-0 dark:bg-[#818cf8]",
  "bg-[#7a7a72] dark:bg-[#f43f5e]"
];

const chartFrame = [
  "text-plate-ink dark:text-[#94a3b8]",
  "[&_.recharts-cartesian-grid_line]:stroke-plate-rule [&_.recharts-cartesian-grid_line]:[stroke-dasharray:none]",
  "dark:[&_.recharts-cartesian-grid_line]:stroke-[rgba(148,163,184,0.12)] dark:[&_.recharts-cartesian-grid_line]:[stroke-dasharray:3_3]",
  "[&_.recharts-tooltip-cursor]:fill-plate-ink/[0.06] dark:[&_.recharts-tooltip-cursor]:fill-[rgba(16,185,129,0.08)]"
].join(" ");

type WeeklyVehicleRevenueChartProps = {
  data: Array<Record<string, string | number>>;
  vehicles: string[];
};

function VehicleTooltip({
  active,
  payload,
  label,
  vehicles
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
  vehicles: string[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border-2 border-plate-ink bg-plate-white px-3 py-2 dark:rounded-xl dark:border dark:border-neutral-700 dark:bg-neutral-950/95 dark:shadow-xl dark:backdrop-blur-sm">
      <p className="text-[14px] font-semibold text-plate-ink dark:text-[11px] dark:uppercase dark:text-neutral-400">{label}</p>
      <div className="mt-1 space-y-1 dark:mt-2">
        {payload.map((item) => {
          const index = Math.max(0, vehicles.indexOf(item.name ?? ""));
          return (
            <div key={item.name} className="flex items-center justify-between gap-4 text-[15px] dark:text-xs">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-plate-ink dark:text-neutral-300">
                <span
                  className={`h-3 w-3 shrink-0 rounded-sm dark:h-2 dark:w-2 dark:rounded-full ${swatchClasses[index % swatchClasses.length]}`}
                />
                <span className="max-w-32 truncate">{item.name}</span>
              </span>
              <span className="font-plate text-[18px] font-bold text-plate-ink dark:[font-family:inherit] dark:text-xs dark:font-semibold dark:text-white">
                {formatCDF(Number(item.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeeklyVehicleRevenueChart({ data, vehicles }: WeeklyVehicleRevenueChartProps) {
  return (
    <div className={chartFrame}>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ left: 0, right: 12, top: 16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "currentColor" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "currentColor" }}
            tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
          />
          <Tooltip content={<VehicleTooltip vehicles={vehicles} />} cursor={{ fill: "rgba(16,185,129,0.08)" }} isAnimationActive={false} />
          {vehicles.map((vehicle, index) => (
            <Bar
              key={vehicle}
              dataKey={vehicle}
              name={vehicle}
              fill={colors[index % colors.length]}
              className={`${plateBarClasses[index % plateBarClasses.length]} ${darkBarClasses[index % darkBarClasses.length]}`}
              radius={[4, 4, 0, 0]}
              maxBarSize={34}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-semibold text-plate-ink dark:hidden">
        {vehicles.map((vehicle, index) => (
          <li key={vehicle} className="inline-flex items-center gap-2">
            <span className={`h-3.5 w-3.5 rounded-sm ${swatchClasses[index % swatchClasses.length]}`} aria-hidden />
            {vehicle}
          </li>
        ))}
      </ul>
    </div>
  );
}
