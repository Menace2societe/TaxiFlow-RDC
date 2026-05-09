import { FileText } from "lucide-react";

export default function InvestorDocumentsPage() {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
      <FileText className="text-copper dark:text-amber-300" size={24} aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Documents Legaux</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Contrats, justificatifs et documents de suivi capital.</p>
    </section>
  );
}
