.select("id, entry_date, revenue, fuel_cost, other_expenses, mileage, currency, exchange_rate, notes, drivers(name), vehicles(plate)")
      .order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    setEntries((data as any) || []);
    setQueueCount(JSON.parse(localStorage.getItem("taxiflow_queue") || "[]").length);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const c = localStorage.getItem("taxiflow_currency") as Currency;
    if (c) setCurrency(c);
    const r = localStorage.getItem("taxiflow_rate");
    if (r) { setExchangeRate(parseFloat(r)); setRateInput(r); }
  }, [load]);
  function toggleCurrency() {
    const next: Currency = currency === "USD" ? "CDF" : "USD";
    setCurrency(next); localStorage.setItem("taxiflow_currency", next);
  }
  function applyRate() {
    const r = parseFloat(rateInput) || 2800;
    setExchangeRate(r); localStorage.setItem("taxiflow_rate", r.toString());
    setShowRateInput(false);
  }
  function display(amount: number, eCur: Currency, eRate: number) {
    return formatAmount(toDisplayCurrency(amount, eCur, currency, eRate), currency);
  }
  return (
    <div className="p-5 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Saisies quotidiennes</h1>
        <p className="text-[#64748b] text-sm mt-1">Historique des entrées journalières</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={toggleCurrency}
          className="flex items-center gap-2 px-4 py-2 bg-[#12121e] border border-[#2a2a40] rounded-xl text-sm font-medium text-white hover:border-[#7c63f5] transition-colors">
          <span className={currency === "USD" ? "text-[#22c55e]" : "text-[#f59e0b]"}>{currency}</span>
          <span className="text-[#64748b]">&#8644;</span>
          <span className="text-[#64748b]">{currency === "USD" ? "CDF" : "USD"}</span>
        </button>
        <button onClick={() => setShowRateInput(s => !s)}
          className="px-3 py-2 bg-[#12121e] border border-[#2a2a40] rounded-xl text-xs text-[#94a3b8] hover:text-white transition-colors">
          1 USD = {exchangeRate.toLocaleString()} CDF ✎
        </button>
        {queueCount > 0 && (
          <span className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            {queueCount} en attente de sync
          </span>
        )}
        <button onClick={() => setShowForm(true)}
          className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 bg-[#7c63f5] hover:bg-[#9580ff] rounded-xl text-sm font-semibold text-white transition-colors">
          + Nouvelle saisie
        </button>
      </div>
      {showRateInput && (
        <div className="mb-4 p-4 bg-[#12121e] border border-[#7c63f5]/30 rounded-xl">
          <p className="text-xs text-[#94a3b8] mb-2">Taux de change manuel (CDF par USD)</p>
          <div className="flex gap-3">
            <input type="number" value={rateInput} onChange={e => setRateInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5]" placeholder="2800" />
            <button onClick={applyRate} className="px-4 py-2 bg-[#7c63f5] hover:bg-[#9580ff] rounded-xl text-sm font-semibold text-white">OK</button>
            <button onClick={() => setShowRateInput(false)} className="px-3 py-2 text-[#64748b] hover:text-white text-sm">×</button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-[#64748b] text-sm text-center py-12">Chargement...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#64748b] text-sm">Aucune saisie pour le moment</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-6 py-2.5 bg-[#7c63f5] hover:bg-[#9580ff] rounded-xl text-sm font-semibold text-white">
            Ajouter la première saisie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => {
            const net = e.revenue - e.fuel_cost - e.other_expenses;
            return (
              <div key={e.id} className="bg-[#12121e] border border-[#2a2a40] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold text-white truncate">{e.drivers?.name || "—"} • {e.vehicles?.plate || "—"}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {new Date(e.entry_date + "T00:00:00").toLocaleDateString("fr-CD", { day: "numeric", month: "short", year: "numeric" })}
                      {e.mileage > 0 && ` • ${e.mileage} km`}
                    </p>
                    {e.notes && <p className="text-xs text-[#94a3b8] mt-1 italic">&ldquo;{e.notes}&rdquo;</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#22c55e]">+{display(e.revenue, e.currency, e.exchange_rate)}</p>
                    <p className="text-xs text-[#ef4444]">-{display(e.fuel_cost + e.other_expenses, e.currency, e.exchange_rate)}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${net >= 0 ? "text-[#94a3b8]" : "text-[#ef4444]"}`}>
                      net {net >= 0 ? "+" : ""}{display(net, e.currency, e.exchange_rate)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Mobile FAB */}
      <button onClick={() => setShowForm(true)}
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-[#7c63f5] hover:bg-[#9580ff] rounded-2xl text-white text-2xl shadow-lg shadow-[#7c63f5]/30 flex items-center justify-center z-30 transition-all active:scale-95">
        +
      </button>
      <DailyEntryBottomSheet open={showForm} onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
        currency={currency} exchangeRate={exchangeRate} />
    </div>
  );
}
