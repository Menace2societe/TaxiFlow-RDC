"use client";
import { useState } from 'react';
import { DollarSign, CheckCircle, Clock, Plus } from 'lucide-react';

export default function EntriesPage() {
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('CDF');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Versements Chauffeurs</h1>
        <button className="bg-[#7c63f5] hover:bg-[#6a52e0] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all">
          <Plus size={20} /> Nouveau Versement
        </button>
      </div>

      {/* Formulaire Rapide */}
      <div className="bg-[#121214] border border-slate-800 p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-2 font-semibold">CHAUFFEUR</label>
            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:border-[#7c63f5] outline-none">
              <option>Kabasele Théo</option>
              <option>Jean-Marc Bolongo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-2 font-semibold">MONTANT</label>
            <div className="relative">
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 pl-10 text-sm focus:border-[#7c63f5] outline-none" placeholder="0.00" />
              <div className="absolute left-3 top-2.5 text-slate-500"><DollarSign size={16} /></div>
            </div>
          </div>
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
            <button onClick={() => setCurrency('USD')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'USD' ? 'bg-[#7c63f5] text-white' : 'text-slate-500'}`}>USD</button>
            <button onClick={() => setCurrency('CDF')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'CDF' ? 'bg-[#7c63f5] text-white' : 'text-slate-500'}`}>CDF</button>
          </div>
          <button className="w-full bg-[#22c55e] text-black font-bold py-2.5 rounded-lg hover:bg-[#1db053] transition-all">
            Valider le Versement
          </button>
        </div>
      </div>

      {/* Historique avec Validation */}
      <div className="bg-[#121214] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="p-4 font-semibold text-slate-400">Date</th>
              <th className="p-4 font-semibold text-slate-400">Chauffeur</th>
              <th className="p-4 font-semibold text-slate-400">Montant</th>
              <th className="p-4 font-semibold text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                <td className="p-4 text-slate-400 italic">Auj. 14:20</td>
                <td className="p-4 font-medium">Jean-Marc Bolongo</td>
                <td className="p-4 font-bold text-[#22c55e]">{i === 1 ? '65,000 CDF' : '35.00 USD'}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded-full w-fit text-xs">
                    <CheckCircle size={14} /> Validé
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
