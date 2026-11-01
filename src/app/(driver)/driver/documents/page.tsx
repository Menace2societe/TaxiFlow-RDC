import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Upload } from "lucide-react";
import { uploadLegalDocument } from "@/actions/legal-documents";
import { StateMark, type DayState } from "@/components/driver/plate";
import { getCurrentUserId, getDriverProfile, getOwnerVehicles } from "@/lib/dashboard/data";
import { daysUntil, expiryState, type ExpiryState } from "@/lib/documents/expiry";
import { getDriverLegalDocuments } from "@/lib/legal-documents/data";
import {
  documentTypeLabelByValue,
  ownerDriverDocumentTypeOptions
} from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";
// Le chauffeur-patron peut aussi envoyer son permis
import type { DocumentType } from "@/lib/supabase/types";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

const ownerDriverAllowedTypes: ReadonlyArray<{ value: DocumentType; label: string }> = [
  ...ownerDriverDocumentTypeOptions,
  { value: "permis", label: "Permis de conduire" }
];

type DriverDocumentsPageProps = {
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

export default async function DriverDocumentsPage({ searchParams }: DriverDocumentsPageProps) {
  const driverId = await getCurrentUserId();

  if (!driverId) {
    redirect(loginWithNext(ROUTES.DRIVER_DOCUMENTS));
  }

  const params = await searchParams;

  const [documents, driverProfile] = await Promise.all([
    getDriverLegalDocuments(driverId),
    getDriverProfile(driverId)
  ]);

  const isOwnerDriver = driverProfile?.is_owner_driver === true;

  // Pour un chauffeur-patron, récupérer ses véhicules pour le select
  const ownedVehicles = isOwnerDriver ? await getOwnerVehicles(driverId) : [];

  const today = todayInAppTimezone();

  return (
    <div className="pb-6">
      <h1 className="font-plate text-[26px] font-bold leading-tight">Mes papiers</h1>
      <p className="mt-1 text-[16px]">
        {isOwnerDriver
          ? "Vous êtes chauffeur-propriétaire : ajoutez vous-même vos papiers (carte rose, assurance, permis…)."
          : "Les papiers et contrats envoyés par votre investisseur."}
      </p>

      {/* ─── Alertes ─── */}
      {params?.error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {params.error}
        </p>
      ) : null}
      {params?.uploaded ? (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Papier envoyé.
        </p>
      ) : null}

      {/* ─── Liste des papiers ─── */}
      <section aria-labelledby="docs-title" className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="docs-title" className="font-plate text-[24px] font-bold">
            Mes documents
          </h2>
          <p className="text-[14px] font-medium">
            {documents.length} papier{documents.length > 1 ? "s" : ""}
          </p>
        </div>

        {documents.length > 0 ? (
          <ul className="mt-2 border-b-2 border-plate-rule">
            {documents.map((document) => {
              const state = expiryMark[expiryState(document.expires_at, today)];
              return (
                <li key={document.id} className="border-t-2 border-plate-rule py-4">
                  <h3 className="break-words text-[17px] font-bold">{document.document_name}</h3>
                  <p className="mt-0.5 text-[15px]">
                    {documentTypeLabelByValue.get(document.document_type) ?? document.document_type}
                    {" · ajouté le "}
                    {formatDate(document.created_at)}
                  </p>
                  <p className={`mt-1 flex items-center gap-2 text-[15px] font-semibold ${state === "bad" ? "text-plate-bad" : ""}`}>
                    <StateMark state={state} />
                    {expiryText(document.expires_at, today)}
                  </p>
                  {document.file_url ? (
                    <Link
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary mt-3 w-full px-4 no-underline sm:w-auto"
                    >
                      <ExternalLink size={18} aria-hidden />
                      Ouvrir le papier
                    </Link>
                  ) : (
                    <p className="mt-2 text-[15px]">
                      Fichier introuvable pour le moment.{" "}
                      {isOwnerDriver ? "Envoyez-le à nouveau ci-dessous." : "Demandez à votre investisseur de le renvoyer."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
            <p className="text-[17px] font-bold">Aucun papier pour le moment</p>
            <p className="mt-1 text-[16px]">
              {isOwnerDriver
                ? "Envoyez votre carte rose, votre assurance ou votre permis avec le formulaire ci-dessous."
                : "Votre investisseur n'a encore envoyé aucun papier sur votre compte."}
            </p>
          </div>
        )}
      </section>

      {/* ─── Envoi (uniquement chauffeur-patron) ─── */}
      {isOwnerDriver ? (
        <section aria-labelledby="upload-title" className="mt-10">
          <h2 id="upload-title" className="font-plate text-[26px] font-bold">
            Ajouter un papier
          </h2>
          <p className="mt-1 text-[16px]">Une photo nette ou un PDF. Vous serez prévenu 30 jours puis 7 jours avant l&apos;expiration.</p>

          <form action={uploadLegalDocument} encType="multipart/form-data" className="mt-4 grid gap-4">
            <input type="hidden" name="return_path" value={ROUTES.DRIVER_DOCUMENTS} />
            {/* driver_id = l'utilisateur lui-même (chauffeur-patron) */}
            <input type="hidden" name="driver_id" value={driverId} />

            <label className="block text-[15px] font-semibold">
              Type de papier
              <select name="document_type" className="field relative z-20 mt-1.5" required defaultValue="">
                <option value="" disabled>
                  Choisir…
                </option>
                {ownerDriverAllowedTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[15px] font-semibold">
              Nom du papier
              <input
                name="document_name"
                className="field relative z-20 mt-1.5 cursor-text"
                placeholder="Ex. : Carte rose 2026"
                required
              />
            </label>

            <label className="block text-[15px] font-semibold">
              Date d&apos;expiration (si le papier en a une)
              <input name="expires_at" type="date" className="field relative z-20 mt-1.5" />
            </label>

            <label className="block text-[15px] font-semibold">
              Véhicule concerné (si c&apos;est un papier du véhicule)
              <select name="vehicle_id" className="field relative z-20 mt-1.5" defaultValue="">
                <option value="">Aucun véhicule en particulier</option>
                {ownedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.plate_number})
                  </option>
                ))}
              </select>
              {ownedVehicles.length === 0 ? (
                <span className="mt-1 block text-[15px] font-normal">Aucun véhicule enregistré à votre nom.</span>
              ) : null}
            </label>

            <label className="block text-[15px] font-semibold">
              Fichier
              <input
                type="file"
                name="file"
                className="field relative z-20 mt-1.5 cursor-pointer py-2.5"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                required
              />
              <span className="mt-1 block text-[15px] font-normal">PDF, JPG ou PNG, 10 Mo au plus.</span>
            </label>

            <button type="submit" className="btn-primary w-full">
              <Upload size={18} aria-hidden />
              Envoyer le papier
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
