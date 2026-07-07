import Link from "next/link";
import { Download, Eye, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const documents = [
  { id: "doc-001", title: "Contrat d'investissement", category: "Contrat", status: "Valide", date: "02 Mai 2026", size: "1.4 MB" },
  { id: "doc-002", title: "Assurance flotte", category: "Conformite", status: "A renouveler", date: "18 Juin 2026", size: "860 KB" },
  { id: "doc-003", title: "Rapport fiscal trimestriel", category: "Rapport", status: "Pret", date: "30 Avr 2026", size: "2.1 MB" },
  { id: "doc-004", title: "Etat des versements hebdomadaires", category: "Finance", status: "Pret", date: "06 Mai 2026", size: "720 KB" }
] as const;

type DocumentStatus = (typeof documents)[number]["status"];
type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

const statusVariant: Record<DocumentStatus, BadgeVariant> = {
  Valide: "success",
  Pret: "info",
  "A renouveler": "warning"
};

export default function InvestorDocumentsPage() {
  const data = documents;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Conformite</p>
          <h1 className="mt-1 text-3xl font-semibold">Contrats et rapports</h1>
        </div>
        <Link className="btn-primary min-h-10 px-3" href={`${ROUTES.INVESTOR_DOCUMENTS}?download=all`}>
          <Download size={16} aria-hidden />
          Telecharger dossier
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <FileText className="text-palm dark:text-emerald-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Documents</p>
            <p className="mt-1 text-2xl font-semibold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ShieldCheck className="text-river dark:text-cyan-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Conformes</p>
            <p className="mt-1 text-2xl font-semibold">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <FileText className="text-copper dark:text-amber-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">A verifier</p>
            <p className="mt-1 text-2xl font-semibold">1</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText size={20} aria-hidden />
            Dossier investisseur
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-semibold">{document.title}</TableCell>
                  <TableCell>{document.category}</TableCell>
                  <TableCell>{document.date}</TableCell>
                  <TableCell>{document.size}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[document.status] ?? "neutral"}>{document.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-secondary min-h-9 px-3" href={`/investor/documents?preview=${document.id}`}>
                        <Eye size={16} aria-hidden />
                        Voir
                      </Link>
                      <Link className="btn-secondary min-h-9 px-3" href={`/investor/documents?download=${document.id}`}>
                        <Download size={16} aria-hidden />
                        PDF
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
