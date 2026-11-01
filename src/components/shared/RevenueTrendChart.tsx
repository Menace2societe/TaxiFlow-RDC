"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity } from "lucide-react";
import { formatCDF } from "@/lib/utils/currency";
import type { TrendPoint } from "@/lib/dashboard/data";

// ─── Types ────────────────────────────────────────────────────────────────────

type RevenueTrendChartProps = {
  data: TrendPoint[];
  /** Couleur du trait et du dégradé dans le look sombre (hex). Dans l'univers « plaque », le trait est à l'encre. */
  color?: string;
  /** Hauteur du conteneur SVG en pixels. Défaut : 220. */
  height?: number;
  /** Afficher uniquement les N derniers points pour éviter la surcharge. 0 = tous. */
  maxPoints?: number;
};

// Tooltip : clair par défaut (espace chauffeur), sombre sous `dark:` (espace investisseur).
function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-2 border-plate-ink bg-plate-white px-3 py-2 dark:rounded-xl dark:border dark:border-neutral-700 dark:bg-neutral-900/95 dark:shadow-xl dark:backdrop-blur-sm">
      <p className="text-[14px] font-semibold text-plate-ink dark:text-[11px] dark:uppercase dark:tracking-wider dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 font-plate text-[20px] font-bold text-plate-ink dark:[font-family:inherit] dark:text-base dark:text-white">
        {formatCDF(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Graphique de tendance des revenus (AreaChart Recharts).
 * Réutilisable dans le portail investisseur et le portail chauffeur.
 *
 * @param data     Tableau `{ date: string, amount: number }[]` trié du plus ancien au plus récent.
 * @param color    Couleur principale (hex). Défaut : #10b981 (emerald-500).
 * @param height   Hauteur du graphique en px. Défaut : 220.
 * @param maxPoints Limiter le nombre de points affichés (0 = tous).
 */
export function RevenueTrendChart({
  data,
  color = "#10b981",
  height = 220,
  maxPoints = 0
}: RevenueTrendChartProps) {
  const chartData = maxPoints > 0 ? data.slice(-maxPoints) : data;

  // Si toutes les valeurs sont à 0, on ne trace pas le graphique
  const hasData = chartData.some((p) => p.amount > 0);

  if (!hasData) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-plate-ink px-4 text-center dark:rounded-none dark:border-0"
      >
        <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500 dark:flex">
          <Activity size={18} aria-hidden />
        </div>
        <p className="text-[16px] text-plate-ink dark:text-xs dark:text-neutral-500">Aucun versement validé sur cette période</p>
      </div>
    );
  }

  const gradientId = `trend-gradient-${color.replace("#", "")}`;

  // Attributs SVG = look sombre (couleur + dégradé). Dans l'univers « plaque », les classes CSS,
  // prioritaires, tracent un trait d'encre sans remplissage sur des filets pleins ; `dark:` rétablit
  // le sombre via les variables --trend-color / --trend-fill.
  const frame = [
    "text-plate-ink dark:text-[#94a3b8]",
    "[&_.recharts-cartesian-grid_line]:stroke-plate-rule [&_.recharts-cartesian-grid_line]:[stroke-opacity:1] [&_.recharts-cartesian-grid_line]:[stroke-dasharray:none]",
    "dark:[&_.recharts-cartesian-grid_line]:[stroke:currentColor] dark:[&_.recharts-cartesian-grid_line]:[stroke-opacity:0.18] dark:[&_.recharts-cartesian-grid_line]:[stroke-dasharray:3_3]",
    "[&_.recharts-area-curve]:stroke-plate-ink [&_.recharts-area-curve]:[stroke-width:2.5] dark:[&_.recharts-area-curve]:[stroke:var(--trend-color)] dark:[&_.recharts-area-curve]:[stroke-width:2]",
    "[&_.recharts-area-area]:fill-none dark:[&_.recharts-area-area]:[fill:var(--trend-fill)]",
    "[&_.recharts-active-dot_circle]:fill-plate-ink dark:[&_.recharts-active-dot_circle]:[fill:var(--trend-color)]",
    "[&_.recharts-tooltip-cursor]:stroke-plate-rule [&_.recharts-tooltip-cursor]:[stroke-opacity:1] dark:[&_.recharts-tooltip-cursor]:[stroke:var(--trend-color)] dark:[&_.recharts-tooltip-cursor]:[stroke-opacity:0.18]"
  ].join(" ");

  return (
    <div className={frame} style={{ "--trend-color": color, "--trend-fill": `url(#${gradientId})` } as React.CSSProperties}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.18} />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "currentColor" }}
            interval="preserveStartEnd"
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "currentColor" }}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            width={36}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 2 }}
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="amount"
            name="Versements"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 2, className: "stroke-white dark:stroke-[#0a0f0d]" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
