"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCDF } from "@/lib/utils/currency";

const colors = ["#1f7a55", "#0e7490", "#b86b37", "#7c3aed", "#dc2626"];

type WeeklyVehicleRevenueChartProps = {
  data: Array<Record<string, string | number>>;
  vehicles: string[];
};

export function WeeklyVehicleRevenueChart({ data, vehicles }: WeeklyVehicleRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip formatter={(value) => formatCDF(Number(value))} cursor={{ fill: "rgba(31, 122, 85, 0.08)" }} />
        {vehicles.map((vehicle, index) => (
          <Bar key={vehicle} dataKey={vehicle} name={vehicle} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
