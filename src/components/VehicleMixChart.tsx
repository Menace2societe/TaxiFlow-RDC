"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Attributs = ancien look sombre (espace admin) ; classes = univers « plaque » clair, `dark:` pour revenir au sombre.
const colors = ["#1f7a55", "#0e7490"];
const cellClasses = [
  "fill-plate-ink stroke-plate-white [stroke-width:2] dark:fill-[#1f7a55] dark:stroke-white dark:[stroke-width:1]",
  "fill-plate-rule stroke-plate-ink [stroke-width:2] dark:fill-[#0e7490] dark:stroke-white dark:[stroke-width:1]"
];

type VehicleMixChartProps = {
  data: Array<{ name: string; value: number }>;
};

export function VehicleMixChart({ data }: VehicleMixChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} className={cellClasses[index % cellClasses.length]} />
          ))}
        </Pie>
        <Tooltip isAnimationActive={false} />
      </PieChart>
    </ResponsiveContainer>
  );
}
