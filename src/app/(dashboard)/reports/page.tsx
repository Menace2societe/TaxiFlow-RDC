"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const data = [
  { name: 'Lun', revenue: 450000 },
  { name: 'Mar', revenue: 520000 },
  { name: 'Mer', revenue: 480000 },
  { name: 'Jeu', revenue: 610000 },
  { name: 'Ven', revenue: 590000 },
  { name: 'Sam', revenue: 750000 },
  { name: 'Dim', revenue: 400000 },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Rapports de Performance</h1>
        <p className="text-slate-400">Analyse financière globale à Kinshasa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Recettes */}
        <div className="bg-[#121214] border border-slate-800 p-6 rounded-2xl">
          <h3 className="mb-6 font-semibold">Revenus Hebdomadaires (CDF)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c63f5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c63f5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e22', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#7c63f5" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistiques clés */}
        <div className="bg-[#121214] border border-slate-800 p-6 rounded-2xl grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Moyenne / Jour</p>
            <p className="text-xl font-bold text-[#22c55e]">542,000 CDF</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Taux Change (Moyen)</p>
            <p className="text-xl font-bold text-[#7c63f5]">2850 CDF/USD</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl col-span-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Dépenses Fuel (Estimation)</p>
            <p className="text-xl font-bold text-red-400">18.5% des recettes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
