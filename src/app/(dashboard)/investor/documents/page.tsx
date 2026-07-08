import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, Upload } from "lucide-react";
import { uploadLegalDocument } from "@/actions/legal-documents";
import { getCurrentUserId, getDriverProfiles, getOwnerVehicles } from "@/lib/dashboard/data";
import { getInvestorLegalDocuments } from "@/lib/legal-documents/data";
import { loginWithNext, ROUTES } from "@/lib/routes";

type InvestorDocumentsPageProps = {
  searchParams?: { error?: string; uploaded?: string };
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
  const driverNameById = new Map(drivers.map((driver) => [driver.id, driver.full_name ?? driver.phone ?? driver.id.slice(0, 8)]));

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-300">Conformite</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Documents legaux</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Televersez les contrats et documents associes a chaque chauffeur.
          </p>
        </div>
      </header>

      {searchParams?.error ? (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams?.uploaded ? (
        <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Document televerse et associe au chauffeur.
        </div>
      ) : null}

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Upload size={18} className="text-emerald-300" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Ajouter un document chauffeur</h2>
        </div>

        <form action={uploadLegalDocument} encType="multipart/form-data" className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
            Chauffeur concerne
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
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
            Nom du document
            <input
              name="document_name"
              className="field relative z-20 cursor-text"
              placeholder="Contrat chauffeur"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-neutral-300 md:col-span-2">
            Fichier
            <input
              type="file"
              name="file"
              className="relative z-20 w-full cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </label>

          <button type="submit" className="btn-primary md:col-span-2">
            <Upload size={16} aria-hidden />
            Televerser le document
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Documents associes</h2>
            <p className="text-sm text-neutral-500">{documents.length} document(s)</p>
          </div>
          <FileText size={18} className="text-neutral-500" aria-hidden />
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Document</th>
                <th>Chauffeur</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="font-semibold text-white">{document.document_name}</td>
                  <td className="text-neutral-300">{driverNameById.get(document.driver_id) ?? document.driver_id.slice(0, 8)}</td>
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
                  <td colSpan={4} className="py-8 text-center text-neutral-500">
                    Aucun document legal televerse.
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
