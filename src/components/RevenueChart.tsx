"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

type RevenueChartProps = {
  data: Array<{ date: string; revenue: number; costs: number }>;
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip formatter={(value) => formatCDF(Number(value))} />
        <Bar dataKey="revenue" name="Revenus" fill="#1f7a55" radius={[4, 4, 0, 0]} />
        <Bar dataKey="costs" name="Couts" fill="#b86b37" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
