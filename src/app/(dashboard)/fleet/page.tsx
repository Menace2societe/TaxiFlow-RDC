"use client";
import { Car, Tool, AlertCircle, Plus, Search, MoreVertical } from 'lucide-react';
import { useState } from 'react';

export default function FleetPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const vehicles = [
    { id: 1, model: "Toyota IST", plate: "1234AB/01", driver: "Kabasele Théo", status: "Actif", health: 95, lastService: "12/10/23" },
    { id: 2, model: "Toyota Belta", plate: "5678CD/01", driver: "Jean-Marc B.", status: "Garage", health: 40, lastService: "05/01/24" },
    { id: 3, model: "Toyota Ketch", plate: "9012EF/01", driver: "Non assigné", status: "Repos", health: 80, lastService: "20/12/23" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ma Flotte</h1>
          <p className="text-slate-400 text-sm">Gestion technique des {vehicles.length} véhicules</p>
        </div>
        <button className="bg-[#7c63f5] hover:bg-[#6a52e0] px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-[#7c63f5]/20">
          <Plus size={20} /> Ajouter un véhicule
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Rechercher une plaque ou un modèle..." 
          className="w-full bg-[#121214] border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-[#7c63f5] outline-none transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {vehicles.map((car) => (
          <div key={car.id} className="bg-[#121214] border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl ${car.status === 'Actif' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-slate-800 text-slate-400'}`}>
                  <Car size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{car.model}</h3>
                  <p className="text-[#7c63f5] font-mono text-sm tracking-widest uppercase">{car.plate}</p>
                </div>
              </div>
              <button className="text-slate-600 hover:text-white"><MoreVertical size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Chauffeur</p>
                <p className="text-sm font-medium">{car.driver}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Dernier Entretien</p>
                <p className="text-sm font-medium">{car.lastService}</p>
              </div>
            </div>

            {/* Barre de santé du véhicule */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 text-[10px] uppercase">État du moteur</span>
                <span className={car.health > 50 ? 'text-[#22c55e]' : 'text-red-500'}>{car.health}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${car.health > 80 ? 'bg-[#22c55e]' : car.health > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${car.health}%` }}
                ></div>
              </div>
            </div>

            {car.status === 'Garage' && (
              <div className="mt-4 flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 p-2 rounded-lg">
                <AlertCircle size={14} /> En attente de pièces (Direction)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
