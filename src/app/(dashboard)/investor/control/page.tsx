import { redirect } from "next/navigation";
import { CalendarX2, Camera, FileWarning, Gauge, ShieldAlert, Unplug } from "lucide-react";
import { ReviewEntryForm } from "@/components/investor/ReviewEntryForm";
import { getControlData, type ControlEntry } from "@/lib/control/data";
import { getCurrentUserId } from "@/lib/dashboard/data";
import { expiryLabel } from "@/lib/documents/expiry";
import { documentTypeLabelByValue } from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { DocumentType } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

function Section({
  icon: Icon,
  title,
  description,
  count,
  children
}: {
  icon: typeof ShieldAlert;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${count > 0 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
            <Icon size={18} aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-neutral-400">{description}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            count > 0 ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {count}
        </span>
      </header>
      <div className="divide-y divide-neutral-800">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-6 text-sm text-neutral-500">{text}</p>;
}

function EntrySummary({ entry }: { entry: ControlEntry }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-white">{entry.vehicle_label}</p>
      <p className="text-xs text-neutral-400">
        {entry.entry_date} · {entry.driver_name ?? "Chauffeur inconnu"}
      </p>
      <p className="mt-1 text-sm text-neutral-300">
        km {entry.start_km.toLocaleString("fr-CD")} → {entry.end_km.toLocaleString("fr-CD")} ·{" "}
        <span className="font-semibold text-amber-200">{entry.distance_covered.toLocaleString("fr-CD")} km</span> pour{" "}
        <span className="font-semibold text-white">{formatCDF(entry.revenue_cdf)}</span>
      </p>
    </div>
  );
}

export default async function InvestorControlPage() {
  const ownerId = await getCurrentUserId();
  if (!ownerId) redirect(loginWithNext(ROUTES.INVESTOR_CONTROL));

  const data = await getControlData(ownerId);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-300">Espace investisseur</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Contrôle & alertes</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Recettes suspectes à trancher, kilomètres roulés sans recette, jours sans versement et documents à renouveler.
        </p>
      </header>

      <Section
        icon={ShieldAlert}
        title="Recettes suspectes à examiner"
        description="Plus de 50 km pour 5 000 FC ou moins. Regardez la photo du compteur, puis tranchez."
        count={data.toReview.length}
      >
        {data.toReview.length === 0 ? <Empty text="Rien à examiner." /> : null}
        {data.toReview.map((entry) => (
          <article key={entry.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto_minmax(0,280px)] md:items-start">
            <EntrySummary entry={entry} />
            {entry.photo_url ? (
              <a href={entry.photo_url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, pas d'optimisation possible */}
                <img
                  src={entry.photo_url}
                  alt={`Compteur ${entry.vehicle_label} le ${entry.entry_date}`}
                  className="h-28 w-40 rounded-lg border border-neutral-700 object-cover"
                />
              </a>
            ) : (
              <span className="inline-flex h-28 w-40 items-center justify-center rounded-lg border border-dashed border-red-500/40 text-xs text-red-300">
                Pas de photo
              </span>
            )}
            <ReviewEntryForm entryId={entry.id} />
          </article>
        ))}
      </Section>

      <Section
        icon={Unplug}
        title="Kilomètres roulés sans recette"
        description="Le compteur a avancé entre deux journées déclarées : courses faites hors application, ou compteur qui recule."
        count={data.continuity.length}
      >
        {data.continuity.length === 0 ? <Empty text="Compteurs cohérents d'un jour à l'autre." /> : null}
        {data.continuity.map((anomaly) => (
          <article key={anomaly.entry_id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">{anomaly.vehicle_label}</p>
              <p className="text-xs text-neutral-400">
                Fin le {anomaly.previous_entry_date} : {anomaly.previous_end_km.toLocaleString("fr-CD")} km · départ le{" "}
                {anomaly.entry_date} : {anomaly.start_km.toLocaleString("fr-CD")} km
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold ${
                anomaly.kind === "undeclared_km" ? "text-amber-200" : "text-red-300"
              }`}
            >
              <Gauge size={14} aria-hidden />
              {anomaly.kind === "undeclared_km"
                ? `${anomaly.gap_km.toLocaleString("fr-CD")} km non déclarés`
                : `Compteur reculé de ${(-anomaly.gap_km).toLocaleString("fr-CD")} km`}
            </span>
          </article>
        ))}
      </Section>

      <Section
        icon={CalendarX2}
        title="Jours sans recette"
        description="Véhicules « en service » sans versement déclaré ces 7 derniers jours."
        count={data.missingDays.length}
      >
        {data.missingDays.length === 0 ? <Empty text="Chaque véhicule en service a déclaré chaque jour." /> : null}
        {data.missingDays.slice(0, 30).map((missing) => (
          <p key={`${missing.vehicle_id}-${missing.date}`} className="px-5 py-3 text-sm text-neutral-300">
            <span className="font-medium text-white">{missing.vehicle_label}</span> · {missing.date}
          </p>
        ))}
      </Section>

      <Section
        icon={Camera}
        title="Versements sans photo du compteur"
        description="Ces 14 derniers jours. Demandez au chauffeur de photographier son compteur à chaque versement."
        count={data.withoutPhoto.length}
      >
        {data.withoutPhoto.length === 0 ? <Empty text="Tous les versements récents ont leur photo." /> : null}
        {data.withoutPhoto.slice(0, 20).map((entry) => (
          <p key={entry.id} className="px-5 py-3 text-sm text-neutral-300">
            <span className="font-medium text-white">{entry.vehicle_label}</span> · {entry.entry_date} ·{" "}
            {entry.driver_name ?? "Chauffeur inconnu"}
          </p>
        ))}
      </Section>

      <Section
        icon={FileWarning}
        title="Documents à renouveler"
        description="Assurance, contrôle technique… qui expirent dans les 30 jours ou sont déjà expirés."
        count={data.expiringDocuments.length}
      >
        {data.expiringDocuments.length === 0 ? <Empty text="Aucun document n'expire bientôt." /> : null}
        {data.expiringDocuments.map((document) => (
          <article key={document.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">
                {documentTypeLabelByValue.get(document.document_type as DocumentType) ?? document.document_name}
              </p>
              <p className="text-xs text-neutral-400">
                {document.document_name}
                {document.vehicle_label ? ` · ${document.vehicle_label}` : ""}
              </p>
            </div>
            <span className={`text-sm font-semibold ${document.days_left < 0 ? "text-red-300" : "text-amber-200"}`}>
              {expiryLabel(document.expires_at, data.today)}
            </span>
          </article>
        ))}
      </Section>

      {data.reviewed.length > 0 ? (
        <Section icon={ShieldAlert} title="Déjà examinées" description="Dernières décisions." count={0}>
          {data.reviewed.map((entry) => (
            <article key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <EntrySummary entry={entry} />
              <span className={`text-sm font-semibold ${entry.review_status === "fraud" ? "text-red-300" : "text-emerald-300"}`}>
                {entry.review_status === "fraud" ? "Fraude" : "Justifiée"}
                {entry.review_note ? ` · ${entry.review_note}` : ""}
              </span>
            </article>
          ))}
        </Section>
      ) : null}
    </div>
  );
}
