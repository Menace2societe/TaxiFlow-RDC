import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, Upload, Car, User, Tag } from "lucide-react";
import { uploadLegalDocument } from "@/actions/legal-documents";
import { getCurrentUserId, getDriverProfiles, getOwnerVehicles } from "@/lib/dashboard/data";
import { getInvestorLegalDocuments } from "@/lib/legal-documents/data";
import { documentTypeOptions, documentTypeLabelByValue } from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";

type InvestorDocumentsPageProps = {
  searchParams?: Promise<{ error?: string; uploaded?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default async function InvestorDocumentsPage({ searchParams }: InvestorDocumentsPageProps) {
  const ownerId = await getCurrentUserId();

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
  const vehicleNameById = new Map(
    vehicles.map((v) => [v.id, `${v.label} (${v.plate_number})`])
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Conformité</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Documents légaux</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Téléversez les contrats et documents associés à chaque chauffeur et véhicule.
          </p>
        </div>
      </header>

      {params?.error ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {params.error}
        </div>
      ) : null}
      {params?.uploaded ? (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          ✓ Document téléversé et associé avec succès.
        </div>
      ) : null}

      {/* ─── Formulaire d'upload ─── */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="mb-5 flex items-center gap-2">
          <Upload size={18} className="text-emerald-300" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Ajouter un document</h2>
        </div>

        <form
          action={uploadLegalDocument}
          encType="multipart/form-data"
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="return_path" value={ROUTES.INVESTOR_DOCUMENTS} />

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
              {documentTypeOptions.map((option) => (
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
              placeholder="Ex : Contrat Jean-Pierre 2025"
              required
            />
          </label>

          {/* Chauffeur concerné */}
          <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
            <span className="flex items-center gap-1.5">
              <User size={12} className="text-neutral-500" />
              Chauffeur concerné
            </span>
            <select
              name="driver_id"
              className="field relative z-20"
              required
              defaultValue=""
            >
              <option value="" disabled>Choisir un chauffeur</option>
              {assignedDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name ?? driver.phone ?? driver.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {assignedDrivers.length === 0 && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Aucun chauffeur assigné. Assignez d&apos;abord un chauffeur à un véhicule.
              </p>
            )}
          </label>

          {/* Associer à un véhicule */}
          <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Car size={12} className="text-neutral-500" />
              Associer à un véhicule <span className="font-normal text-neutral-500">(optionnel)</span>
            </span>
            <select
              name="vehicle_id"
              className="field relative z-20"
              defaultValue=""
            >
              <option value="">— Aucun véhicule spécifique —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.plate_number})
                </option>
              ))}
            </select>
          </label>

          {/* Fichier — pleine largeur */}
          <label className="grid gap-1.5 text-sm font-medium text-neutral-300 sm:col-span-2">
            Fichier
            <input
              type="file"
              name="file"
              className="relative z-20 w-full cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
            />
            <p className="text-xs text-neutral-600">Formats acceptés : PDF, JPG, PNG — 10 Mo max.</p>
          </label>

          <button type="submit" className="btn-primary sm:col-span-2">
            <Upload size={16} aria-hidden />
            Téléverser le document
          </button>
        </form>
      </section>

      {/* ─── Liste des documents ─── */}
      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Documents associés</h2>
            <p className="text-sm text-neutral-500">{documents.length} document(s)</p>
          </div>
          <FileText size={18} className="text-neutral-500" aria-hidden />
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Chauffeur</th>
                <th>Véhicule</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="font-semibold text-white">{document.document_name}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-xs text-neutral-300">
                      {documentTypeLabelByValue.get(document.document_type) ?? document.document_type}
                    </span>
                  </td>
                  <td className="text-neutral-300">
                    {driverNameById.get(document.driver_id) ?? document.driver_id.slice(0, 8)}
                  </td>
                  <td className="text-neutral-400 text-xs">
                    {document.vehicle_id
                      ? (vehicleNameById.get(document.vehicle_id) ?? "—")
                      : <span className="text-neutral-600">—</span>}
                  </td>
                  <td className="text-neutral-400">{formatDate(document.created_at)}</td>
                  <td>
                    <Link
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary min-h-9 px-3"
                    >
                      <Download size={15} aria-hidden />
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-500">
                    Aucun document légal téléversé.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
