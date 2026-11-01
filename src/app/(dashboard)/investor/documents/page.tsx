import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Upload } from "lucide-react";
import { uploadLegalDocument } from "@/actions/legal-documents";
import { PlateChip, StateMark, type DayState } from "@/components/driver/plate";
import { getCurrentUserId, getDriverProfiles, getOwnerVehicles } from "@/lib/dashboard/data";
import { getInvestorLegalDocuments } from "@/lib/legal-documents/data";
import { documentTypeOptions, documentTypeLabelByValue } from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { daysUntil, expiryState, type ExpiryState } from "@/lib/documents/expiry";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

type InvestorDocumentsPageProps = {
  searchParams?: Promise<{ error?: string; uploaded?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

/** Date seule « 2027-03-12 » → « 12 mars 2027 », sans décalage de fuseau. */
function formatDay(isoDate: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`));
}

const expiryMark: Record<ExpiryState, DayState> = {
  ok: "ok",
  soon: "wait",
  expired: "bad",
  unknown: "none"
};

function expiryText(expiresAt: string | null | undefined, today: string): string {
  if (!expiresAt) return "Pas de date d'expiration";
  const days = daysUntil(expiresAt, today);
  const day = formatDay(expiresAt);
  if (days < 0) return `Expiré le ${day}. À renouveler.`;
  if (days === 0) return "Expire aujourd'hui. À renouveler.";
  if (days === 1) return `Expire demain, le ${day}`;
  if (days <= 30) return `Expire le ${day}, dans ${days} jours`;
  return `Valable jusqu'au ${day}`;
}

export default async function InvestorDocumentsPage({ searchParams }: InvestorDocumentsPageProps) {
  const ownerId = await getCurrentUserId();
  const today = todayInAppTimezone();

  if (!ownerId) {
    redirect(loginWithNext(ROUTES.INVESTOR_DOCUMENTS));
  }

  const params = await searchParams;

  const [vehicles, drivers, documents] = await Promise.all([
    getOwnerVehicles(ownerId),
    getDriverProfiles(),
    getInvestorLegalDocuments(ownerId)
  ]);

  const assignedDriverIds = new Set(
    vehicles
      .map((vehicle) => vehicle.driver_id)
      .filter((driverId): driverId is string => Boolean(driverId))
  );
  const assignedDrivers = drivers.filter((driver) => assignedDriverIds.has(driver.id));
  const driverNameById = new Map(
    drivers.map((driver) => [
      driver.id,
      driver.full_name ?? driver.phone ?? driver.id.slice(0, 8)
    ])
  );
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const expiredCount = documents.filter((document) => expiryState(document.expires_at, today) === "expired").length;
  const soonCount = documents.filter((document) => expiryState(document.expires_at, today) === "soon").length;

  return (
    <div className="pb-6">
      <header>
        <h1 className="font-plate text-[30px] font-bold leading-tight">Papiers</h1>
        <p className="mt-1 max-w-3xl text-[16px]">
          Les contrats et papiers de chaque chauffeur et de chaque véhicule, avec leur date d&apos;expiration.
        </p>
      </header>

      {/* ─── Alertes ─── */}
      {params?.error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {params.error}
        </p>
      ) : null}
      {params?.uploaded ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Papier envoyé et associé au chauffeur.
        </p>
      ) : null}

      {/* ─── À renouveler : la seule chose qui demande une action ─── */}
      {expiredCount + soonCount > 0 ? (
        <section aria-labelledby="renew-title" className="mt-6 rounded-xl border-2 border-plate-ink bg-plate-vignette px-4 py-4">
          <h2 id="renew-title" className="font-plate text-[24px] font-bold leading-tight">
            À renouveler
          </h2>
          <ul className="mt-1 text-[16px]">
            {expiredCount > 0 ? (
              <li className="flex items-center gap-2 font-semibold">
                <StateMark state="bad" />
                {expiredCount} papier{expiredCount > 1 ? "s" : ""} expiré{expiredCount > 1 ? "s" : ""}
              </li>
            ) : null}
            {soonCount > 0 ? (
              <li className="flex items-center gap-2 font-semibold">
                <StateMark state="wait" />
                {soonCount} papier{soonCount > 1 ? "s" : ""} expire{soonCount > 1 ? "nt" : ""} dans les 30 jours
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* ─── Liste des papiers ─── */}
      <section aria-labelledby="docs-title" className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="docs-title" className="font-plate text-[24px] font-bold">
            Papiers enregistrés
          </h2>
          <p className="text-[14px] font-medium">
            {documents.length} papier{documents.length > 1 ? "s" : ""}
          </p>
        </div>

        {documents.length > 0 ? (
          <ul className="mt-2 border-b-2 border-plate-rule">
            {documents.map((document) => {
              const state = expiryMark[expiryState(document.expires_at, today)];
              const vehicle = document.vehicle_id ? vehicleById.get(document.vehicle_id) : undefined;
              return (
                <li
                  key={document.id}
                  className="grid gap-3 border-t-2 border-plate-rule py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {vehicle ? <PlateChip plateNumber={vehicle.plate_number} /> : null}
                      <span className="break-words text-[17px] font-bold">{document.document_name}</span>
                    </p>
                    <p className="mt-1 text-[15px]">
                      {documentTypeLabelByValue.get(document.document_type) ?? document.document_type}
                      {" · "}
                      {driverNameById.get(document.driver_id) ?? document.driver_id.slice(0, 8)}
                      {document.vehicle_id ? ` · ${vehicle?.label ?? "Véhicule"}` : ""}
                      {" · ajouté le "}
                      {formatDate(document.created_at)}
                    </p>
                    <p className={`mt-1 flex items-center gap-2 text-[15px] font-semibold ${state === "bad" ? "text-plate-bad" : ""}`}>
                      <StateMark state={state} />
                      {expiryText(document.expires_at, today)}
                    </p>
                  </div>
                  {document.file_url ? (
                    <Link
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary w-full px-4 no-underline sm:w-auto"
                    >
                      <ExternalLink size={18} aria-hidden />
                      Ouvrir
                    </Link>
                  ) : (
                    <p className="text-[15px]">Fichier indisponible</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
            <p className="text-[17px] font-bold">Aucun papier pour le moment</p>
            <p className="mt-1 text-[16px]">Ajoutez le contrat, la carte rose ou l&apos;assurance avec le formulaire ci-dessous.</p>
          </div>
        )}
      </section>

      {/* ─── Envoi ─── */}
      <section aria-labelledby="upload-title" className="mt-10">
        <h2 id="upload-title" className="font-plate text-[24px] font-bold">
          Ajouter un papier
        </h2>
        <p className="mt-1 text-[16px]">
          Une photo nette ou un PDF. Vous serez prévenu 30 jours puis 7 jours avant l&apos;expiration.
        </p>

        <form
          action={uploadLegalDocument}
          encType="multipart/form-data"
          className="mt-4 grid gap-4 rounded-xl border-2 border-plate-rule bg-plate-white p-4 sm:grid-cols-2 md:p-5"
        >
          <input type="hidden" name="return_path" value={ROUTES.INVESTOR_DOCUMENTS} />

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Type de papier
            <select name="document_type" className="field relative z-20" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {documentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Nom du papier
            <input
              name="document_name"
              className="field relative z-20 cursor-text"
              placeholder="Ex. : Contrat Jean-Pierre 2025"
              required
            />
          </label>

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Chauffeur concerné
            <select name="driver_id" className="field relative z-20" required defaultValue="">
              <option value="" disabled>
                Choisir un chauffeur
              </option>
              {assignedDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name ?? driver.phone ?? driver.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {assignedDrivers.length === 0 ? (
              <span className="text-[15px] font-normal">
                Aucun chauffeur affecté. Affectez d&apos;abord un chauffeur à un véhicule.
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Véhicule concerné (si c&apos;est un papier du véhicule)
            <select name="vehicle_id" className="field relative z-20" defaultValue="">
              <option value="">Aucun véhicule en particulier</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.plate_number})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Date d&apos;expiration (assurance, contrôle technique, permis…)
            <input name="expires_at" type="date" className="field relative z-20" />
          </label>

          <label className="grid gap-1.5 text-[15px] font-semibold">
            Fichier
            <input
              type="file"
              name="file"
              className="field relative z-20 cursor-pointer py-2.5"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
            />
            <span className="text-[15px] font-normal">PDF, JPG ou PNG, 10 Mo au plus.</span>
          </label>

          <button type="submit" className="btn-primary w-full sm:col-span-2">
            <Upload size={18} aria-hidden />
            Envoyer le papier
          </button>
        </form>
      </section>
    </div>
  );
}
