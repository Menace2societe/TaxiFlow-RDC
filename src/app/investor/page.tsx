import { createClient } from '@/lib/supabase/server';

export default async function InvestorDashboard() {
  const supabase = await createClient();
  const { data: records } = await supabase.from('daily_records').select('*');

  return (
    <div className="min-h-screen bg-[#0a0a14] p-6 text-white">
      <h1 className="text-3xl font-bold mb-2">Portail Partenaire</h1>
      <p className="text-gray-400 mb-8">Suivi de vos investissements</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {records?.map((rec: any) => (
          <div key={rec.id} className="p-6 bg-[#12121e] border border-[#2a2a40] rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="text-green-500 font-bold text-2xl">+{rec.revenue} CDF</span>
              <span className={`px-3 py-1 rounded-full text-xs ${rec.momo_status === 'validated' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                {rec.momo_status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Réf: {rec.momo_reference}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
