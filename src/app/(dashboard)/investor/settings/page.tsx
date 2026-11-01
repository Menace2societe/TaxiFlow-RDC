import Link from "next/link";
import { Save } from "lucide-react";
import { StateMark } from "@/components/driver/plate";
import { getCurrentProfile } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";

const roleLabels: Record<string, string> = {
  investor: "Investisseur",
  driver: "Chauffeur",
  admin: "Administrateur"
};

const notificationChoices = ["Rapport hebdomadaire", "Alertes maintenance", "Versements reçus"];

export default async function InvestorSettingsPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "investor";

  return (
    <div className="pb-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <h1 className="font-plate text-[30px] font-bold leading-tight">Profil et préférences</h1>
        <Link className="btn-primary w-full px-6 sm:w-auto" href={`${ROUTES.INVESTOR_SETTINGS}?saved=1`}>
          <Save size={18} aria-hidden />
          Enregistrer
        </Link>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="profile-title">
          <h2 id="profile-title" className="font-plate text-[24px] font-bold">
            Informations du profil
          </h2>
          <div className="mt-3 grid gap-4 rounded-xl border-2 border-plate-rule bg-plate-white p-4 md:grid-cols-2 md:p-5">
            <label className="grid gap-1.5 text-[15px] font-semibold">
              Nom complet
              <input className="field" name="full_name" defaultValue={profile?.full_name ?? "Investisseur TaxiFlow"} readOnly />
            </label>
            <label className="grid gap-1.5 text-[15px] font-semibold">
              Téléphone
              <input className="field" name="phone" defaultValue={profile?.phone ?? "+243 000 000 000"} readOnly />
            </label>
            <label className="grid gap-1.5 text-[15px] font-semibold">
              Espace
              <input className="field" name="role" defaultValue={roleLabels[role] ?? role} readOnly />
            </label>
            <label className="grid gap-1.5 text-[15px] font-semibold">
              Devise préférée
              <select className="field" name="currency" defaultValue="CDF">
                <option value="CDF">Franc congolais (CDF)</option>
                <option value="USD">Dollar américain (USD)</option>
              </select>
            </label>
          </div>
        </section>

        <div className="space-y-10">
          <section aria-labelledby="security-title">
            <h2 id="security-title" className="font-plate text-[24px] font-bold">
              Sécurité
            </h2>
            <p className="mt-2 flex items-center justify-between gap-3 border-y-2 border-plate-rule py-3 text-[16px]">
              <span>Session protégée</span>
              <span className="inline-flex items-center gap-2 font-bold">
                <StateMark state="ok" />
                Active
              </span>
            </p>
          </section>

          <section aria-labelledby="notifications-title">
            <h2 id="notifications-title" className="font-plate text-[24px] font-bold">
              Notifications
            </h2>
            <ul className="mt-2 border-b-2 border-plate-rule text-[16px]">
              {notificationChoices.map((label) => (
                <li key={label} className="border-t-2 border-plate-rule">
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2">
                    {label}
                    <input type="checkbox" defaultChecked className="h-6 w-6 shrink-0 cursor-pointer accent-plate-band" />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
