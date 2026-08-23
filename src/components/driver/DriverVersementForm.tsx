"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, PlusCircle, WifiOff } from "lucide-react";
import { submitDriverDailyEntry } from "@/actions/entries";

const offlineQueueKey = "taxiflow_driver_daily_entries_queue";

type OfflineEntry = {
  id: string;
  entry_date: string;
  amount: string;
  declared_amount: string;
  currency: "CDF" | "USD";
  start_km: string;
  end_km: string;
  notes: string;
};

type Notice = {
  tone: "success" | "warning" | "error";
  message: string;
};

function readQueue(): OfflineEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(offlineQueueKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: OfflineEntry[]) {
  window.localStorage.setItem(offlineQueueKey, JSON.stringify(entries));
}

function formDataFromEntry(entry: OfflineEntry) {
  const data = new FormData();
  data.set("entry_date", entry.entry_date);
  data.set("amount", entry.amount);
  data.set("declared_amount", entry.declared_amount);
  data.set("currency", entry.currency);
  data.set("start_km", entry.start_km);
  data.set("end_km", entry.end_km);
  data.set("notes", entry.notes);
  return data;
}

function SubmitButton({ disabled, pending }: { disabled: boolean; pending: boolean }) {
  return (
    <button className="btn-primary min-h-12 w-full text-base" type="submit" disabled={disabled || pending}>
      {pending ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <PlusCircle size={20} aria-hidden />}
      {pending ? "Enregistrement..." : "Enregistrer mon versement"}
    </button>
  );
}

type Props = {
  hasVehicle: boolean;
};

export function DriverVersementForm({ hasVehicle }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQueuedCount(readQueue().length);

    const syncQueuedEntries = () => {
      if (!navigator.onLine) return;

      const queue = readQueue();
      if (queue.length === 0) return;

      startTransition(async () => {
        const remaining: OfflineEntry[] = [];
        let synced = 0;

        for (const entry of queue) {
          try {
            const result = await submitDriverDailyEntry(formDataFromEntry(entry));
            if (result.ok || result.message.includes("existe deja")) {
              synced += 1;
            } else {
              remaining.push(entry);
            }
          } catch {
            remaining.push(entry);
          }
        }

        writeQueue(remaining);
        setQueuedCount(remaining.length);

        if (synced > 0) {
          setNotice({
            tone: remaining.length > 0 ? "warning" : "success",
            message:
              remaining.length > 0
                ? `${synced} versement(s) synchronise(s), ${remaining.length} encore en attente.`
                : "Donnees locales synchronisees avec succes."
          });
        }
      });
    };

    window.addEventListener("online", syncQueuedEntries);
    syncQueuedEntries();

    return () => window.removeEventListener("online", syncQueuedEntries);
  }, []);

  function queueEntry(entry: OfflineEntry) {
    const queue = [...readQueue(), entry];
    writeQueue(queue);
    setQueuedCount(queue.length);
    setNotice({
      tone: "warning",
      message:
        "Hors-ligne : Donnees enregistrees localement, elles seront synchronisees au retour du reseau."
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = String(formData.get("amount") ?? "");
    const startKm = Number(formData.get("start_km"));
    const endKm = Number(formData.get("end_km"));

    if (!Number.isFinite(startKm) || !Number.isFinite(endKm) || endKm < startKm) {
      setNotice({
        tone: "error",
        message: "Le kilometrage de fin ne peut pas etre inferieur au kilometrage de debut."
      });
      return;
    }

    const entry: OfflineEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      entry_date: String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10)),
      amount,
      declared_amount: amount,
      currency: String(formData.get("currency") ?? "CDF") === "USD" ? "USD" : "CDF",
      start_km: String(formData.get("start_km") ?? ""),
      end_km: String(formData.get("end_km") ?? ""),
      notes: String(formData.get("notes") ?? "")
    };

    if (!navigator.onLine) {
      queueEntry(entry);
      form.reset();
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitDriverDailyEntry(formDataFromEntry(entry));
        setNotice({
          tone: result.ok ? "success" : "error",
          message: result.message
        });

        if (result.ok) {
          form.reset();
        }
      } catch {
        queueEntry(entry);
        form.reset();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-950"
    >
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            notice.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : notice.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {notice.tone === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <WifiOff size={16} className="mt-0.5 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}
      {queuedCount > 0 && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 dark:bg-stone-900 dark:text-stone-300">
          {queuedCount} versement(s) en attente de synchronisation.
        </p>
      )}
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Date
        <input className="field mt-1 min-h-12 text-base" name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Montant
        <input className="field mt-1 min-h-12 text-base" name="amount" type="number" min="1" step="1" inputMode="decimal" required />
      </label>
      <fieldset className="text-sm font-medium text-stone-700 dark:text-stone-200">
        <legend className="mb-2">Devise</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="CDF" defaultChecked className="peer sr-only" />
            <div className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
              CDF
            </div>
          </label>
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="USD" className="peer sr-only" />
            <div className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
              USD
            </div>
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Kilometrage de debut
        <input className="field mt-1 min-h-12 text-base" name="start_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Kilometrage de fin
        <input className="field mt-1 min-h-12 text-base" name="end_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Note (optionnel)
        <input className="field mt-1 min-h-12 text-base" name="notes" placeholder="Course, client..." />
      </label>
      <SubmitButton disabled={!hasVehicle} pending={isPending} />
    </form>
  );
}
