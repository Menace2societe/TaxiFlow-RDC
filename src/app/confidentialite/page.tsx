import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Confidentialité — TaxiFlow RDC" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="14 octobre 2026">
      <h2>Données collectées</h2>
      <ul>
        <li>Identité et contact : nom, numéro de téléphone, email.</li>
        <li>Activité : véhicules, recettes, kilométrages, versements, dépenses, pannes, contrats.</li>
        <li>Fichiers : photos du compteur et documents légaux (carte rose, assurance, permis…).</li>
        <li>Paiements : opérateur et numéro Mobile Money, montants et références de transaction.</li>
      </ul>

      <h2>Pourquoi</h2>
      <p>
        Uniquement pour fournir le service : suivi de la flotte, validation des versements, alertes, facturation de
        l&apos;abonnement. Aucune donnée n&apos;est vendue ni utilisée pour de la publicité.
      </p>

      <h2>Qui y a accès</h2>
      <ul>
        <li>L&apos;investisseur voit les données de sa flotte et de ses chauffeurs.</li>
        <li>Le chauffeur voit les données de son véhicule et ses propres versements.</li>
        <li>Les documents et photos sont privés, ouverts par des liens temporaires.</li>
        <li>
          Sous-traitants techniques : hébergement de la base ([Supabase, région à préciser]), hébergement du site
          ([Vercel]), paiements ([pawaPay]), messages WhatsApp ([Meta]), SMS ([fournisseur à préciser]).
        </li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>[Durées à définir : par exemple pendant l&apos;abonnement, puis suppression ou archivage après X mois.]</p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la correction ou la suppression de vos données en écrivant à [adresse de contact].
        [Références légales applicables en RDC à faire préciser par un juriste.]
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexions chiffrées, accès limité par rôle directement dans la base de données, documents privés et journal des
        paiements. Signalez tout problème à [adresse de contact].
      </p>
    </LegalPage>
  );
}
