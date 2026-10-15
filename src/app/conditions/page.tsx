import { LegalPage } from "@/components/legal/LegalPage";
import { FREE_VEHICLES, TRIAL_DAYS } from "@/lib/billing/plans";

export const metadata = { title: "Conditions d'utilisation — TaxiFlow RDC" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updatedAt="14 octobre 2026">
      <h2>1. Le service</h2>
      <p>
        TaxiFlow RDC est un logiciel en ligne édité par [raison sociale, forme juridique, RCCM, adresse] qui permet aux
        propriétaires de véhicules de suivre les recettes, les versements, les dépenses et les documents de leur flotte, et
        à leurs chauffeurs de déclarer leurs versements.
      </p>

      <h2>2. Comptes</h2>
      <ul>
        <li>L&apos;investisseur crée son compte et inscrit ses chauffeurs ; il est responsable des informations saisies.</li>
        <li>Chaque utilisateur garde ses identifiants et codes d&apos;accès confidentiels.</li>
        <li>Le rôle (chauffeur, investisseur) est choisi à l&apos;inscription et ne peut être modifié que par TaxiFlow.</li>
      </ul>

      <h2>3. Essai, prix et paiement</h2>
      <ul>
        <li>
          {FREE_VEHICLES} véhicule est gratuit sans limite de durée. Les véhicules suivants bénéficient de {TRIAL_DAYS} jours
          d&apos;essai, puis d&apos;un abonnement mensuel selon la grille publiée sur le site.
        </li>
        <li>Le paiement se fait par Mobile Money ou en espèces auprès de TaxiFlow. Les montants en CDF suivent le taux du jour.</li>
        <li>
          Sans paiement à l&apos;échéance, les données restent consultables mais l&apos;ajout de véhicules payants est bloqué.
        </li>
        <li>[Politique de remboursement à définir.]</li>
      </ul>

      <h2>4. Paiements des chauffeurs</h2>
      <p>
        Les versements Mobile Money transitent par un prestataire de paiement agréé ([pawaPay]). TaxiFlow n&apos;est pas
        partie à la relation entre l&apos;investisseur et son chauffeur et ne garantit pas les sommes dues entre eux.
      </p>

      <h2>5. Alertes et contrôle kilométrique</h2>
      <p>
        Les alertes (recette suspecte, kilomètres non déclarés) sont des indications calculées à partir des données saisies.
        Elles ne constituent pas une preuve de fraude : l&apos;investisseur reste seul responsable de ses décisions envers ses
        chauffeurs.
      </p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>
        TaxiFlow fait ses meilleurs efforts pour que le service soit disponible, sans garantie d&apos;absence
        d&apos;interruption. [Plafond de responsabilité à définir.]
      </p>

      <h2>7. Résiliation</h2>
      <p>
        L&apos;investisseur peut arrêter à tout moment. TaxiFlow peut suspendre un compte en cas d&apos;usage frauduleux ou
        contraire aux présentes conditions.
      </p>

      <h2>8. Droit applicable</h2>
      <p>[Droit applicable et tribunal compétent à faire préciser par un juriste.]</p>

      <h2>Contact</h2>
      <p>[Adresse email et numéro WhatsApp du support]</p>
    </LegalPage>
  );
}
