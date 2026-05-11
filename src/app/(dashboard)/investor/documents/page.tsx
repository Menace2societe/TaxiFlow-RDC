import { FileText, ShieldCheck } from "lucide-react";

const documents = [
  { title: "Contrat d'investissement", status: "Valide", date: "02 Mai 2026" },
  { title: "Assurance flotte", status: "A renouveler", date: "18 Juin 2026" },
  { title: "Rapport fiscal trimestriel", status: "Pret", date: "30 Avr 2026" }
];

export default function InvestorDocumentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Conformite</p>
        <h1 className="mt-1 text-3xl font-semibold">Documents Legaux</h1>
      </header>

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText size={20} aria-hidden />
            Dossier investisseur
          </h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {documents.map((document) => (
            <article className="flex flex-col justify-between gap-3 px-5 py-4 md:flex-row md:items-center" key={document.title}>
              <div>
                <p className="font-semibold">{document.title}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{document.date}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-palm/10 px-3 py-2 text-sm font-semibold text-palm dark:text-emerald-300">
                <ShieldCheck size={16} aria-hidden />
                {document.status}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
