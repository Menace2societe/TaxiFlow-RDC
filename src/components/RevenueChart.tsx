"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

type RevenueChartProps = {
  data: Array<{ date: string; revenue: number; costs: number }>;
};

function ChartTooltip({
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
            <span className="inline-flex items-center gap-1.5 text-neutral-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-white">{formatCDF(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
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
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
        <Bar dataKey="revenue" name="Revenus" fill="url(#revenueBars)" radius={[8, 8, 2, 2]} maxBarSize={36} />
        <Bar dataKey="costs" name="Couts" fill="url(#costBars)" radius={[8, 8, 2, 2]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
