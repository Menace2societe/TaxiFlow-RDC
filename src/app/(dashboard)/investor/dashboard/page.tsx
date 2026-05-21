"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  CarTaxiFront,
  TrendingUp,
  Wallet,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bike,
  MoreHorizontal,
} from "lucide-react";

// ─── Static demo data ─────────────────────────────────────────────────────────

const STATS = [
  {
    id: "capital",
    label: "Capital Investi",
    value: "$15 000",
    sub: "Portefeuille actif",
    delta: "+0%",
    deltaPositive: true,
    icon: Wallet,
    accent: "#10b981",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    id: "vehicles",
    label: "Véhicules Actifs",
    value: "3",
    sub: "3 Taxis · Kinshasa",
    delta: "En service",
    deltaPositive: true,
    icon: CarTaxiFront,
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.15)",
  },
  {
    id: "revenue",
    label: "Recettes de la Période",
    value: "$420",
    sub: "7 derniers jours",
    delta: "+12% vs semaine préc.",
    deltaPositive: true,
    icon: TrendingUp,
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
  },
] as const;

type ActivityStatus = "validated" | "pending" | "alert";

interface ActivityRow {
  id: string;
  vehicle: string;
  type: "taxi" | "moto";
  event: string;
  amount: string | null;
  time: string;
  status: ActivityStatus;
}

const ACTIVITY: ActivityRow[] = [
  {
    id: "act-1",
    vehicle: "Taxi B-204",
    type: "taxi",
    event: "Recette journalière validée",
    amount: "+$25",
    time: "Aujourd'hui, 14h32",
    status: "validated",
  },
  {
    id: "act-2",
    vehicle: "Taxi K-117",
    type: "taxi",
    event: "Recette journalière validée",
    amount: "+$22",
    time: "Aujourd'hui, 13h05",
    status: "validated",
  },
  {
    id: "act-3",
    vehicle: "Taxi G-089",
    type: "taxi",
    event: "Versement en attente de validation",
    amount: "+$18",
    time: "Aujourd'hui, 11h50",
    status: "pending",
  },
  {
    id: "act-4",
    vehicle: "Taxi B-204",
    type: "taxi",
    event: "Recette journalière validée",
    amount: "+$30",
    time: "Hier, 16h15",
    status: "validated",
  },
  {
    id: "act-5",
    vehicle: "Taxi K-117",
    type: "taxi",
    event: "Contrôle maintenance signalé",
    amount: null,
    time: "Hier, 09h00",
    status: "alert",
  },
  {
    id: "act-6",
    vehicle: "Taxi G-089",
    type: "taxi",
    event: "Recette journalière validée",
    amount: "+$20",
    time: "Il y a 2 jours",
    status: "validated",
  },
];

const WEEKLY = [
  { label: "Lun", pct: 68, amount: "$55" },
  { label: "Mar", pct: 82, amount: "$67" },
  { label: "Mer", pct: 75, amount: "$61" },
  { label: "Jeu", pct: 90, amount: "$73" },
  { label: "Ven", pct: 95, amount: "$78" },
  { label: "Sam", pct: 55, amount: "$45" },
  { label: "Dim", pct: 40, amount: "$41" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ActivityStatus }) {
  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399" }}>
        <CheckCircle2 size={10} />
        Validée
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
        <Clock size={10} />
        En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}>
      <AlertCircle size={10} />
      Alerte
    </span>
  );
}

function VehicleIcon({ type }: { type: "taxi" | "moto" }) {
  const Icon = type === "taxi" ? CarTaxiFront : Bike;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: "rgba(16,185,129,0.12)" }}
    >
      <Icon size={15} style={{ color: "#34d399" }} aria-hidden />
    </span>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function InvestorDashboardPage() {
  const today = new Date().toLocaleDateString("fr-CD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#34d399" }}>
          Portail Investisseur · TaxiFlow RDC
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Vue d&apos;ensemble
            </h1>
            <p className="mt-1 text-sm capitalize" style={{ color: "#6b7f77" }}>
              {today}
            </p>
          </div>
          <span
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: "rgba(16,185,129,0.1)",
              color: "#34d399",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <Activity size={13} />
            Flotte opérationnelle
          </span>
        </div>
      </header>

      {/* ── Stat cards ── */}
      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label="Statistiques clés"
      >
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.id}
              className="relative overflow-hidden rounded-xl p-5"
              style={{
                backgroundColor: "#111d19",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 40px ${stat.glow}`,
              }}
            >
              {/* Glow blob */}
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
                style={{ backgroundColor: stat.glow }}
                aria-hidden
              />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#6b7f77" }}>
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "#6b7f77" }}>
                    {stat.sub}
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${stat.accent}20` }}
                >
                  <Icon size={20} style={{ color: stat.accent }} aria-hidden />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1 text-xs font-medium"
                style={{ color: stat.deltaPositive ? "#34d399" : "#f87171" }}>
                {stat.deltaPositive
                  ? <ArrowUpRight size={13} aria-hidden />
                  : <ArrowDownRight size={13} aria-hidden />}
                {stat.delta}
              </div>
            </article>
          );
        })}
      </section>

      {/* ── Main two-column section ── */}
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">

        {/* Activity feed */}
        <div
          className="rounded-xl"
          style={{
            backgroundColor: "#111d19",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <h2 className="text-sm font-semibold text-white">
              Activité récente de la flotte
            </h2>
            <button
              className="rounded-md p-1 transition hover:bg-white/5"
              aria-label="Plus d'options"
            >
              <MoreHorizontal size={16} style={{ color: "#6b7f77" }} />
            </button>
          </div>

          {/* Table — desktop */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Véhicule", "Événement", "Montant", "Heure", "Statut"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium"
                        style={{ color: "#6b7f77" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {ACTIVITY.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="transition hover:bg-white/[0.02]"
                    style={
                      idx < ACTIVITY.length - 1
                        ? { borderBottom: "1px solid rgba(255,255,255,0.04)" }
                        : {}
                    }
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <VehicleIcon type={row.type} />
                        <span className="font-medium text-white">
                          {row.vehicle}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "#9db8b0" }}>
                      {row.event}
                    </td>
                    <td className="px-5 py-3.5 font-semibold"
                      style={{ color: row.amount ? "#34d399" : "#6b7f77" }}>
                      {row.amount ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#6b7f77" }}>
                      {row.time}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* List — mobile */}
          <div className="divide-y sm:hidden" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {ACTIVITY.map((row) => (
              <div key={row.id} className="flex items-start gap-3 px-4 py-3.5">
                <VehicleIcon type={row.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {row.vehicle}
                    </p>
                    {row.amount && (
                      <span className="shrink-0 text-sm font-bold" style={{ color: "#34d399" }}>
                        {row.amount}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "#9db8b0" }}>
                    {row.event}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    <span className="text-xs" style={{ color: "#6b7f77" }}>
                      {row.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly bar chart */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "#111d19",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-sm font-semibold text-white">
            Recettes · 7 derniers jours
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "#6b7f77" }}>
            Total&nbsp;: <span className="font-semibold text-white">$420</span>
          </p>

          {/* Bars */}
          <div className="mt-6 flex items-end justify-between gap-2 h-36">
            {WEEKLY.map((day) => (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold" style={{ color: "#34d399" }}>
                  {day.pct >= 80 ? day.amount : ""}
                </span>
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${day.pct}%`,
                      background:
                        day.pct === Math.max(...WEEKLY.map((d) => d.pct))
                          ? "linear-gradient(to top, #059669, #34d399)"
                          : "rgba(16,185,129,0.25)",
                      minHeight: "6px",
                    }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: "#6b7f77" }}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          {/* Mini stats */}
          <div
            className="mt-5 grid grid-cols-2 divide-x rounded-lg"
            style={{
              backgroundColor: "#0d1612",
              border: "1px solid rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            {[
              { label: "Meilleure journée", value: "$78", sub: "Vendredi" },
              { label: "Moy. quotidienne", value: "$60", sub: "Cette semaine" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-3">
                <p className="text-[10px]" style={{ color: "#6b7f77" }}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-bold text-white">
                  {item.value}
                </p>
                <p className="text-[10px]" style={{ color: "#6b7f77" }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Fleet status */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-white">État de la flotte</p>
            {[
              { label: "Taxi B-204", status: "En service", ok: true },
              { label: "Taxi K-117", status: "En service", ok: true },
              { label: "Taxi G-089", status: "Versement en attente", ok: false },
            ].map((v) => (
              <div
                key={v.label}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: "#0d1612" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: v.ok ? "#34d399" : "#fbbf24" }}
                  />
                  <span className="text-xs font-medium text-white">
                    {v.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: v.ok ? "#34d399" : "#fbbf24" }}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
