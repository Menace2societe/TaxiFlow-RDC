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
  /** Couleur principale du trait et du gradient (hex ou hsl). Défaut : emerald. */
  color?: string;
  /** Hauteur du conteneur SVG en pixels. Défaut : 220. */
  height?: number;
  /** Afficher uniquement les N derniers points pour éviter la surcharge. 0 = tous. */
  maxPoints?: number;
};

// Tooltip personnalisé dark
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
    <div className="rounded-xl border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-white">{formatCDF(payload[0]?.value ?? 0)}</p>
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
      <div style={{ height }} className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500">
          <Activity size={18} aria-hidden />
        </div>
        <p className="text-xs text-neutral-500">Aucun versement approuvé sur cette période</p>
      </div>
    );
  }

  const gradientId = `trend-gradient-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(148,163,184,0.12)"
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          tick={{ fill: "#94a3b8" }}
          interval="preserveStartEnd"
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          tick={{ fill: "#94a3b8" }}
          tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          width={36}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 2 }} />

        <Area
          type="monotone"
          dataKey="amount"
          name="Versements"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "#0a0f0d", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={600}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
