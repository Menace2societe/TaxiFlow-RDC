"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { Camera, CheckCircle2, Loader2, PlusCircle, WifiOff } from "lucide-react";
import { submitDriverDailyEntry } from "@/actions/entries";
import { compressImageToDataUrl, dataUrlToBlob } from "@/lib/images/compress";
import { createClient } from "@/lib/supabase/client";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

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
  /** Chauffeur qui a saisi : un autre compte sur le même téléphone ne l'envoie pas. */
  user_id?: string;
  /** Photo du compteur compressée (data URL), envoyée à la synchronisation. */
  photo?: string;
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

/** Envoie la photo dans le bucket privé et retourne son chemin. */
async function uploadOdometerPhoto(entry: OfflineEntry): Promise<string | null> {
  if (!entry.photo || !entry.user_id) return null;
  const supabase = createClient();
  const path = `${entry.user_id}/${entry.entry_date}-${entry.id}.jpg`;
  const { error } = await supabase.storage
    .from("odometer-photos")
    .upload(path, await dataUrlToBlob(entry.photo), { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

async function submitEntry(entry: OfflineEntry) {
  const photoPath = await uploadOdometerPhoto(entry);
  const data = formDataFromEntry(entry);
  if (photoPath) data.set("odometer_photo_path", photoPath);
  return submitDriverDailyEntry(data);
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
  /** Taux USD → CDF du jour, affiché sous le choix de devise. */
  usdRate?: number;
};

export function DriverVersementForm({ hasVehicle, usdRate }: Props) {
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
        const {
          data: { user }
        } = await createClient().auth.getUser();

        for (const entry of queue) {
          // Saisie d'un autre chauffeur sur ce téléphone : on la garde pour lui.
          if (!user || (entry.user_id && entry.user_id !== user.id)) {
            remaining.push(entry);
            continue;
          }
          try {
            const result = await submitEntry({ ...entry, user_id: user.id });
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const photoFile = formData.get("odometer_photo");
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
      entry_date: String(formData.get("entry_date") || todayInAppTimezone()),
      amount,
      declared_amount: amount,
      currency: String(formData.get("currency") ?? "CDF") === "USD" ? "USD" : "CDF",
      start_km: String(formData.get("start_km") ?? ""),
      end_km: String(formData.get("end_km") ?? ""),
      notes: String(formData.get("notes") ?? "")
    };

    if (photoFile instanceof File && photoFile.size > 0) {
      try {
        entry.photo = await compressImageToDataUrl(photoFile);
      } catch {
        setNotice({ tone: "error", message: "Photo illisible. Reprenez la photo du compteur." });
        return;
      }
    }

    // getSession lit la session locale : fonctionne aussi sans réseau.
    const {
      data: { session }
    } = await createClient().auth.getSession();
    entry.user_id = session?.user.id;

    if (!navigator.onLine) {
      queueEntry(entry);
      form.reset();
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitEntry(entry);
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
        <input className="field mt-1 min-h-12 text-base" name="entry_date" type="date" defaultValue={todayInAppTimezone()} required />
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
        {usdRate ? (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Taux du jour : 1 USD = {usdRate.toLocaleString("fr-CD")} CDF
          </p>
        ) : null}
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
        <span className="flex items-center gap-1.5">
          <Camera size={14} aria-hidden />
          Photo du compteur (fin de journée)
        </span>
        <input
          className="field mt-1 min-h-12 text-base file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-white"
          name="odometer_photo"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <span className="mt-1 block text-xs font-normal text-stone-500 dark:text-stone-400">
          Recommandée : sans photo, le versement est signalé à votre investisseur.
        </span>
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Note (optionnel)
        <input className="field mt-1 min-h-12 text-base" name="notes" placeholder="Course, client..." />
      </label>
      <SubmitButton disabled={!hasVehicle} pending={isPending} />
    </form>
  );
}
