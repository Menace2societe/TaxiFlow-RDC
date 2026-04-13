"use client";
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Wallet, Users, Car, TrendingUp, Loader2 } from 'lucide-react';

export default function OverviewPage() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState({ revenue: 0, drivers: 0, fleet: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: records } = await supabase.from('daily_records').select('amount, currency, rate');
      const { count: driverCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
      const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });

      const totalRevenue = records?.reduce((acc, curr) => {
        if (curr.currency === 'USD') return acc + (curr.amount * curr.rate);
        return acc + curr.amount;
      }, 0) || 0;

      setStats({ revenue: totalRevenue, drivers: driverCount || 0, fleet: vehicleCount || 0 });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center bg-[#0a0a0c]"><Loader2 className="animate-spin text-[#7c63f5]" size={48} /></div>;

  return (
    <div className="space-y-8 p-4 bg-[#0a0a0c] min-h-screen text-white">
      <div>
        <h1 className="text-3xl font-black text-white italic">TABLEAU DE BORD</h1>
        <p className="text-slate-300">Performance en temps réel - Kinshasa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Wallet className="text-[#22c55e]" />} label="Total Recettes (CDF)" value={stats.revenue.toLocaleString()} />
        <StatCard icon={<Users className="text-[#7c63f5]" />} label="Chauffeurs Actifs" value={stats.drivers.toString()} />
        <StatCard icon={<Car className="text-blue-400" />} label="État de la Flotte" value={`${stats.fleet} Véhicules`} />
      </div>

      <div className="bg-[#121214] border border-slate-800 p-8 rounded-[32px]">
         <h2 className="text-xl font-bold mb-4 text-white">Activités Récentes</h2>
         <p className="text-slate-400 text-sm italic underline decoration-[#7c63f5]">Données synchronisées avec succès.</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-[#121214] border border-slate-800 p-8 rounded-[32px] hover:border-[#7c63f5]/50 transition-all">
      <div className="mb-4">{icon}</div>
      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-black text-white mt-1">{value}</h3>
    </div>
  );
}
