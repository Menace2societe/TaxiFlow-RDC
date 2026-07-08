import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { getCurrentUserId } from "@/lib/dashboard/data";
import { getDriverLegalDocuments } from "@/lib/legal-documents/data";
import { loginWithNext, ROUTES } from "@/lib/routes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default async function DriverDocumentsPage() {
  const driverId = await getCurrentUserId();

  if (!driverId) {
    redirect(loginWithNext(ROUTES.DRIVER_DOCUMENTS));
  }

  const documents = await getDriverLegalDocuments(driverId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
            <FileText size={20} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Documents legaux</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Contrats et fichiers transmis par votre investisseur.
            </p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        <div className="border-b border-neutral-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Mes documents</h2>
          <p className="text-sm text-neutral-500">{documents.length} document(s) disponible(s)</p>
        </div>

        <div className="divide-y divide-neutral-800">
          {documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">{document.document_name}</p>
                <p className="mt-1 text-sm text-neutral-500">Ajoute le {formatDate(document.created_at)}</p>
              </div>
              <Link
                href={document.file_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary min-h-10 px-4"
              >
                <Download size={16} aria-hidden />
                Ouvrir ou telecharger
              </Link>
            </div>
          ))}

          {documents.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-neutral-500">
              Aucun document legal n'est encore associe a votre compte.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
