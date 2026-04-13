"use client";
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ReportsPage() {
  const supabase = createClientComponentClient();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function getLogs() {
      const { data } = await supabase.from('daily_records').select('*, drivers(full_name)').order('created_at', { ascending: false });
      if (data) setLogs(data);
    }
    getLogs();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-8">
      <h1 className="text-3xl font-black italic">RAPPORTS FINANCIERS</h1>
      
      <div className="bg-zinc-950 border border-zinc-900 rounded-[32px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 text-zinc-400 text-xs font-bold uppercase tracking-widest border-b border-zinc-800">
            <tr>
              <th className="p-6">Date</th>
              <th className="p-6">Chauffeur</th>
              <th className="p-6">Montant</th>
              <th className="p-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="p-6 text-zinc-300">{new Date(log.created_at).toLocaleDateString()}</td>
                <td className="p-6 font-bold text-white">{log.drivers?.full_name}</td>
                <td className="p-6 font-black text-[#22c55e]">{log.amount} $</td>
                <td className="p-6"><span className="bg-[#22c55e]/10 text-[#22c55e] px-3 py-1 rounded-full text-[10px] font-bold">ENCAISSÉ</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
