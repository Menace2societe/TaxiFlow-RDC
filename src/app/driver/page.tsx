"use client";
import { Users, Phone, Star, ShieldCheck, Plus, ExternalLink } from 'lucide-react';

export default function DriverPage() {
  const drivers = [
    { id: 1, name: "Kabasele Théo", phone: "+243 81 000 0000", rating: 4.8, trips: 142, status: "En service", revenue: "850k FC" },
    { id: 2, name: "Jean-Marc Bolongo", phone: "+243 82 111 2222", rating: 4.5, trips: 98, status: "Repos", revenue: "620k FC" },
    { id: 3, name: "Moussa Traoré", phone: "+243 89 333 4444", rating: 3.2, trips: 45, status: "Avertissement", revenue: "150k FC" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Chauffeurs</h1>
          <p className="text-slate-400 text-sm">Suivi des performances et contrats</p>
        </div>
        <button className="bg-[#7c63f5] p-2.5 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-[#7c63f5]/20">
          <Plus size={20} /><span className="hidden md:inline">Recruter</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-[#121214] border border-slate-800 rounded-3xl overflow-hidden group hover:border-[#7c63f5]/30 transition-all">
            {/* Header Profil */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-bold border border-slate-700">
                  {driver.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                    driver.status === 'En service' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 
                    driver.status === 'Repos' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {driver.status}
                  </span>
                  <div className="flex items-center gap-1 mt-2 text-orange-400">
                    <Star size={14} fill="currentColor" />
                    <span className="font-bold text-sm">{driver.rating}</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">{driver.name}</h3>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#7c63f5]" /> Permis n° 10928/KIN
              </p>
            </div>

            {/* Stats Chauffeur */}
            <div className="grid grid-cols-2 border-y border-slate-800 bg-slate-900/20">
              <div className="p-4 border-r border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 uppercase">Courses</p>
                <p className="font-bold">{driver.trips}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase">Total Versé</p>
                <p className="font-bold text-[#22c55e]">{driver.revenue}</p>
              </div>
            </div>

            {/* Actions Rapides */}
            <div className="p-4 flex gap-2">
              <a href={`tel:${driver.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl transition-all font-semibold text-sm">
                <Phone size={16} /> Appeler
              </a>
              <button className="p-3 bg-slate-800 hover:bg-[#7c63f5] rounded-xl transition-all">
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
