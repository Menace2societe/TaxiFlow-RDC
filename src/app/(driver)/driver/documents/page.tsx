import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, Crown, Download, FileText, Tag, Upload } from "lucide-react";
import { uploadLegalDocument } from "@/actions/legal-documents";
import { getCurrentUserId, getDriverProfile, getOwnerVehicles } from "@/lib/dashboard/data";
import { getDriverLegalDocuments } from "@/lib/legal-documents/data";
import {
  documentTypeLabelByValue,
  ownerDriverDocumentTypeOptions
} from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";

// Le Chauffeur-Patron peut aussi téléverser son Permis
import type { DocumentType } from "@/lib/supabase/types";

const ownerDriverAllowedTypes: ReadonlyArray<{ value: DocumentType; label: string }> = [
  ...ownerDriverDocumentTypeOptions,
  { value: "permis", label: "Permis de conduire" }
];

type DriverDocumentsPageProps = {
  searchParams?: Promise<{ error?: string; uploaded?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* ─── Header ─── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-emerald-950/20 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
            <FileText size={20} aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-white">Documents légaux</h1>
              {isOwnerDriver && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  <Crown size={10} />
                  Chauffeur-Patron
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              {isOwnerDriver
                ? "Gérez vos propres documents véhicule et identité en toute autonomie."
                : "Contrats et fichiers transmis par votre investisseur."}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Alertes ─── */}
      {params?.error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {params.error}
        </div>
      )}
      {params?.uploaded && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          ✓ Document téléversé avec succès.
        </div>
      )}

      {/* ─── Formulaire upload (uniquement Chauffeur-Patron) ─── */}
      {isOwnerDriver && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/15 p-1.5">
              <Upload size={16} className="text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-amber-100">Ajouter un document</h2>
            <span className="ml-auto rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              Autonome
            </span>
          </div>

          <form
            action={uploadLegalDocument}
            encType="multipart/form-data"
            className="grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="return_path" value={ROUTES.DRIVER_DOCUMENTS} />
            {/* driver_id = l'utilisateur lui-même (Chauffeur-Patron) */}
            <input type="hidden" name="driver_id" value={driverId} />

            {/* Type de document */}
            <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Tag size={12} className="text-neutral-500" />
                Type de document
              </span>
              <select
                name="document_type"
                className="field relative z-20"
                required
                defaultValue=""
              >
                <option value="" disabled>Choisir le type...</option>
                {ownerDriverAllowedTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Nom du document */}
            <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
              Nom du document
              <input
                name="document_name"
                className="field relative z-20 cursor-text"
                placeholder="Ex : Carte Rose 2025"
                required
              />
            </label>

            {/* Véhicule associé */}
            <label className="grid gap-1.5 text-sm font-medium text-neutral-300 sm:col-span-2">
              <span className="flex items-center gap-1.5">
                <Car size={12} className="text-neutral-500" />
                Véhicule associé <span className="font-normal text-neutral-500">(optionnel)</span>
              </span>
              <select
                name="vehicle_id"
                className="field relative z-20"
                defaultValue=""
              >
                <option value="">— Aucun véhicule spécifique —</option>
                {ownedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.plate_number})
                  </option>
                ))}
              </select>
              {ownedVehicles.length === 0 && (
                <p className="text-xs text-neutral-500">
                  Aucun véhicule enregistré à votre nom.
                </p>
              )}
            </label>

            {/* Fichier */}
            <label className="grid gap-1.5 text-sm font-medium text-neutral-300 sm:col-span-2">
              Fichier
              <input
                type="file"
                name="file"
                className="relative z-20 w-full cursor-pointer rounded-lg border border-amber-700/30 bg-neutral-950 px-3 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-amber-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                required
              />
              <p className="text-xs text-neutral-600">PDF, JPG, PNG — 10 Mo max.</p>
            </label>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-5 text-sm font-semibold text-amber-100 transition-all hover:bg-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:col-span-2"
            >
              <Upload size={16} aria-hidden />
              Téléverser le document
            </button>
          </form>
        </section>
      )}

      {/* ─── Liste des documents ─── */}
      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        <div className="border-b border-neutral-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Mes documents</h2>
          <p className="text-sm text-neutral-500">{documents.length} document(s) disponible(s)</p>
        </div>

        <div className="divide-y divide-neutral-800">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{document.document_name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-xs text-neutral-400">
                    {documentTypeLabelByValue.get(document.document_type) ?? document.document_type}
                  </span>
                  <span className="text-xs text-neutral-600">
                    Ajouté le {formatDate(document.created_at)}
                  </span>
                </div>
              </div>
              <Link
                href={document.file_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary min-h-10 px-4"
              >
                <Download size={16} aria-hidden />
                Ouvrir
              </Link>
            </div>
          ))}

          {documents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText size={32} className="mx-auto mb-3 text-neutral-700" />
              <p className="text-sm font-medium text-neutral-400">Aucun document disponible</p>
              <p className="mt-1 text-xs text-neutral-600">
                {isOwnerDriver
                  ? "Téléversez votre Carte Rose, Assurance ou Permis via le formulaire ci-dessus."
                  : "Aucun document légal n'est encore associé à votre compte."}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
