"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, Send, WifiOff } from "lucide-react";
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
      {pending ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <Send size={20} aria-hidden />}
      {pending ? "Envoi…" : "Envoyer mon versement"}
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
                ? `${synced} versement(s) envoyé(s), ${remaining.length} encore sur le téléphone.`
                : "Les versements gardés sur le téléphone sont bien partis."
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
        "Pas de réseau : le versement est gardé sur le téléphone. Il partira tout seul au retour de la connexion."
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
        message: "Le compteur du soir doit être plus grand que celui du matin. Vérifiez les deux chiffres."
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
      className="grid gap-4"
    >
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
            notice.tone === "success"
              ? "border-plate-ok text-plate-ok"
              : notice.tone === "warning"
                ? "border-plate-ink text-plate-ink"
                : "border-plate-bad text-plate-bad"
          }`}
        >
          {notice.tone === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> : notice.tone === "warning" ? <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />}
          <span>{notice.message}</span>
        </div>
      )}
      {queuedCount > 0 && (
        <p className="flex items-center gap-2 rounded-lg border-2 border-dashed border-plate-ink px-4 py-3 text-[15px] font-semibold">
          <WifiOff size={18} className="shrink-0" aria-hidden />
          {queuedCount} versement(s) gardé(s) sur le téléphone, en attente de réseau.
        </p>
      )}
      <label className="block text-[15px] font-semibold">
        Date
        <input className="field mt-1.5" name="entry_date" type="date" defaultValue={todayInAppTimezone()} required />
      </label>
      <label className="block text-[15px] font-semibold">
        Montant
        <input className="field mt-1.5" name="amount" type="number" min="1" step="1" inputMode="decimal" required />
      </label>
      <fieldset className="text-[15px] font-semibold">
        <legend className="mb-1.5">Devise</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="CDF" defaultChecked className="peer sr-only" />
            <div className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-plate-ink bg-plate-white text-[17px] font-bold peer-checked:bg-plate-ink peer-checked:text-plate-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-plate-band">
              CDF
            </div>
          </label>
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="USD" className="peer sr-only" />
            <div className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-plate-ink bg-plate-white text-[17px] font-bold peer-checked:bg-plate-ink peer-checked:text-plate-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-plate-band">
              USD
            </div>
          </label>
        </div>
        {usdRate ? (
          <p className="mt-1.5 text-[14px] font-medium">
            Taux du jour : 1 USD = {usdRate.toLocaleString("fr-CD")} CDF
          </p>
        ) : null}
      </fieldset>
      <label className="block text-[15px] font-semibold">
        Compteur du matin (km)
        <input className="field mt-1.5" name="start_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-[15px] font-semibold">
        Compteur du soir (km)
        <input className="field mt-1.5" name="end_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-[15px] font-semibold">
        <span className="flex items-center gap-1.5">
          <Camera size={14} aria-hidden />
          Photo du compteur du soir
        </span>
        <input
          className="field mt-1.5 py-2.5"
          name="odometer_photo"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <span className="mt-1 block text-[14px] font-medium">
          Sans photo, votre investisseur verra le versement comme « à vérifier ».
        </span>
      </label>
      <label className="block text-[15px] font-semibold">
        Remarque (si besoin)
        <input className="field mt-1.5" name="notes" placeholder="Ex. : embouteillage à Victoire" />
      </label>
      <SubmitButton disabled={!hasVehicle} pending={isPending} />
    </form>
  );
}
