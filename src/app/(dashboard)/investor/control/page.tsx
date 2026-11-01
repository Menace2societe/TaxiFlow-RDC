import { redirect } from "next/navigation";
import { ReviewEntryForm } from "@/components/investor/ReviewEntryForm";
import { PlateChip, StateMark, type DayState } from "@/components/driver/plate";
import { getControlData, type ControlEntry } from "@/lib/control/data";
import { getCurrentUserId } from "@/lib/dashboard/data";
import { expiryLabel } from "@/lib/documents/expiry";
import { documentTypeLabelByValue } from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { DocumentType } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

/** Les données livrent « Toyota Noah · 4821BK01 » : on sépare le modèle et la plaque pour afficher la petite plaque. */
function splitVehicleLabel(label: string): { label: string; plate: string | null } {
  const index = label.lastIndexOf(" · ");
  if (index === -1) return { label, plate: null };
  return { label: label.slice(0, index), plate: label.slice(index + 3) };
}

function VehicleName({ label }: { label: string }) {
  const vehicle = splitVehicleLabel(label);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      {vehicle.plate ? <PlateChip plateNumber={vehicle.plate} /> : null}
      <span className="font-bold">{vehicle.label}</span>
    </span>
  );
}

function Section({
  id,
  title,
  description,
  count,
  countLabel,
  sticker = false,
  children
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  /** « 3 à trancher » ; par défaut, le nombre seul. */
  countLabel?: string;
  /** Vignette jaune : la seule chose à faire maintenant (une fois par écran). */
  sticker?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={id} className="font-plate text-[24px] font-bold">
          {title}
        </h2>
        {sticker && count > 0 ? (
          <span className="rounded-full bg-plate-vignette px-3 py-1 text-[15px] font-bold">{countLabel ?? count}</span>
        ) : (
          <span className="text-[15px] font-semibold">{countLabel ?? count}</span>
        )}
      </div>
      <p className="mt-1 text-[16px]">{description}</p>
      <ol className="mt-2 border-b-2 border-plate-rule">{children}</ol>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 border-t-2 border-plate-rule py-3 text-[15px] font-semibold">
      <StateMark state="ok" />
      {text}
    </li>
  );
}

function StateWord({ state, children, className }: { state: DayState; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[15px] font-semibold ${className ?? ""}`}>
      <StateMark state={state} />
      {children}
    </span>
  );
}

function EntrySummary({ entry }: { entry: ControlEntry }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px]">
        <VehicleName label={entry.vehicle_label} />
      </p>
      <p className="mt-1 text-[15px] font-medium">
        {entry.entry_date} · {entry.driver_name ?? "Chauffeur inconnu"}
      </p>
      <p className="mt-1 text-[16px]">
        Compteur {entry.start_km.toLocaleString("fr-CD")} → {entry.end_km.toLocaleString("fr-CD")} :{" "}
        <b>{entry.distance_covered.toLocaleString("fr-CD")} km</b> pour <b>{formatCDF(entry.revenue_cdf)}</b>
      </p>
    </div>
  );
}

export default async function InvestorControlPage() {
  const ownerId = await getCurrentUserId();
  if (!ownerId) redirect(loginWithNext(ROUTES.INVESTOR_CONTROL));

  const data = await getControlData(ownerId);

  return (
    <div className="pb-6">
      <header>
        <h1 className="font-plate text-[30px] font-bold leading-tight">Contrôle et alertes</h1>
        <p className="mt-1 max-w-3xl text-[16px]">
          Recettes suspectes à trancher, kilomètres roulés sans recette, jours sans versement et documents à renouveler.
        </p>
      </header>

      <Section
        id="review-title"
        title="Recettes suspectes à examiner"
        description="Plus de 50 km pour 5 000 FC ou moins. Regardez la photo du compteur, puis tranchez."
        count={data.toReview.length}
        countLabel={data.toReview.length > 0 ? `${data.toReview.length} à trancher` : "0"}
        sticker
      >
        {data.toReview.length === 0 ? <Empty text="Rien à examiner." /> : null}
        {data.toReview.map((entry) => (
          <li
            key={entry.id}
            className="grid gap-4 border-t-2 border-plate-rule py-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,300px)] md:items-start"
          >
            <div className="min-w-0">
              <EntrySummary entry={entry} />
              <p className="mt-2">
                <StateWord state="bad">Suspecte</StateWord>
              </p>
            </div>
            {entry.photo_url ? (
              <a href={entry.photo_url} target="_blank" rel="noreferrer" className="block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, pas d'optimisation possible */}
                <img
                  src={entry.photo_url}
                  alt={`Compteur ${entry.vehicle_label} le ${entry.entry_date}`}
                  className="h-32 w-44 rounded-lg border-2 border-plate-ink object-cover"
                />
                <span className="mt-1 block text-[14px] font-semibold underline underline-offset-4">
                  Agrandir la photo
                </span>
              </a>
            ) : (
              <span className="inline-flex h-32 w-44 items-center justify-center rounded-lg border-2 border-dashed border-plate-ink text-[15px] font-semibold">
                Pas de photo
              </span>
            )}
            <ReviewEntryForm entryId={entry.id} />
          </li>
        ))}
      </Section>

      <Section
        id="continuity-title"
        title="Kilomètres roulés sans recette"
        description="Le compteur a avancé entre deux journées déclarées : courses faites hors application, ou compteur qui recule."
        count={data.continuity.length}
      >
        {data.continuity.length === 0 ? <Empty text="Compteurs cohérents d'un jour à l'autre." /> : null}
        {data.continuity.map((anomaly) => (
          <li
            key={anomaly.entry_id}
            className="flex flex-col gap-2 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[15px]">
                <VehicleName label={anomaly.vehicle_label} />
              </p>
              <p className="mt-1 text-[15px]">
                Fin le {anomaly.previous_entry_date} : {anomaly.previous_end_km.toLocaleString("fr-CD")} km · départ le{" "}
                {anomaly.entry_date} : {anomaly.start_km.toLocaleString("fr-CD")} km
              </p>
            </div>
            <StateWord state="bad" className="shrink-0 text-plate-bad">
              {anomaly.kind === "undeclared_km"
                ? `${anomaly.gap_km.toLocaleString("fr-CD")} km non déclarés`
                : `Compteur reculé de ${(-anomaly.gap_km).toLocaleString("fr-CD")} km`}
            </StateWord>
          </li>
        ))}
      </Section>

      <Section
        id="missing-title"
        title="Jours sans recette"
        description="Véhicules « en service » sans versement déclaré ces 7 derniers jours."
        count={data.missingDays.length}
      >
        {data.missingDays.length === 0 ? <Empty text="Chaque véhicule en service a déclaré chaque jour." /> : null}
        {data.missingDays.slice(0, 30).map((missing) => (
          <li
            key={`${missing.vehicle_id}-${missing.date}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-plate-rule py-3 text-[15px]"
          >
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <VehicleName label={missing.vehicle_label} />
              <span className="font-medium">{missing.date}</span>
            </span>
            <StateWord state="none">Rien déclaré</StateWord>
          </li>
        ))}
      </Section>

      <Section
        id="photo-title"
        title="Versements sans photo du compteur"
        description="Ces 14 derniers jours. Demandez au chauffeur de photographier son compteur à chaque versement."
        count={data.withoutPhoto.length}
      >
        {data.withoutPhoto.length === 0 ? <Empty text="Tous les versements récents ont leur photo." /> : null}
        {data.withoutPhoto.slice(0, 20).map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-plate-rule py-3 text-[15px]"
          >
            <VehicleName label={entry.vehicle_label} />
            <span className="font-medium">
              {entry.entry_date} · {entry.driver_name ?? "Chauffeur inconnu"}
            </span>
          </li>
        ))}
      </Section>

      <Section
        id="documents-title"
        title="Documents à renouveler"
        description="Assurance, contrôle technique… qui expirent dans les 30 jours ou sont déjà expirés."
        count={data.expiringDocuments.length}
      >
        {data.expiringDocuments.length === 0 ? <Empty text="Aucun document n'expire bientôt." /> : null}
        {data.expiringDocuments.map((document) => (
          <li
            key={document.id}
            className="flex flex-col gap-2 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[16px] font-bold">
                {documentTypeLabelByValue.get(document.document_type as DocumentType) ?? document.document_name}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                <span>{document.document_name}</span>
                {document.vehicle_label ? <VehicleName label={document.vehicle_label} /> : null}
              </p>
            </div>
            <StateWord
              state={document.days_left < 0 ? "bad" : "wait"}
              className={`shrink-0 ${document.days_left < 0 ? "text-plate-bad" : ""}`}
            >
              {expiryLabel(document.expires_at, data.today)}
            </StateWord>
          </li>
        ))}
      </Section>

      {data.reviewed.length > 0 ? (
        <Section id="reviewed-title" title="Déjà examinées" description="Dernières décisions." count={data.reviewed.length}>
          {data.reviewed.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <EntrySummary entry={entry} />
              <StateWord
                state={entry.review_status === "fraud" ? "bad" : "ok"}
                className={`shrink-0 ${entry.review_status === "fraud" ? "text-plate-bad" : ""}`}
              >
                {entry.review_status === "fraud" ? "Fraude" : "Justifiée"}
                {entry.review_note ? ` · ${entry.review_note}` : ""}
              </StateWord>
            </li>
          ))}
        </Section>
      ) : null}
    </div>
  );
}
