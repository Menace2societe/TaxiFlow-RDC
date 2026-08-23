"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

const colors = ["#10b981", "#38bdf8", "#f59e0b", "#818cf8", "#f43f5e"];

type WeeklyVehicleRevenueChartProps = {
  data: Array<Record<string, string | number>>;
  vehicles: string[];
};

function VehicleTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-950/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase text-neutral-400">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-neutral-300">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="max-w-32 truncate">{item.name}</span>
            </span>
            <span className="font-semibold text-white">{formatCDF(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyVehicleRevenueChart({ data, vehicles }: WeeklyVehicleRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
        <Tooltip content={<VehicleTooltip />} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
        {vehicles.map((vehicle, index) => (
          <Bar key={vehicle} dataKey={vehicle} name={vehicle} fill={colors[index % colors.length]} radius={[8, 8, 2, 2]} maxBarSize={34} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
