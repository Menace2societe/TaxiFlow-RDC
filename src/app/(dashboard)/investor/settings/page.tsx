import Link from "next/link";
import { Bell, Save, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

export default async function InvestorSettingsPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Compte investisseur</p>
          <h1 className="mt-1 text-3xl font-semibold">Profil et preferences</h1>
        </div>
        <Link className="btn-primary min-h-10 px-3" href={`${ROUTES.INVESTOR_SETTINGS}?saved=1`}>
          <Save size={16} aria-hidden />
          Enregistrer
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <UserRound size={20} aria-hidden />
              Informations du profil
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Nom complet
                <input className="field mt-1" name="full_name" defaultValue={profile?.full_name ?? "Investisseur TaxiFlow"} readOnly />
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Telephone
                <input className="field mt-1" name="phone" defaultValue={profile?.phone ?? "+243 000 000 000"} readOnly />
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Portail
                <input className="field mt-1 capitalize" name="role" defaultValue={profile?.role ?? "investor"} readOnly />
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Devise preferee
                <select className="field mt-1" name="currency" defaultValue="CDF">
                  <option value="CDF">Franc congolais (CDF)</option>
                  <option value="USD">Dollar americain (USD)</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <ShieldCheck className="text-palm dark:text-emerald-300" size={24} aria-hidden />
              <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Securite</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-semibold">Session protegee</p>
                <Badge variant="success">Actif</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Bell className="text-river dark:text-cyan-300" size={24} aria-hidden />
              <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Notifications</p>
              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-center justify-between gap-4">
                  Rapport hebdomadaire
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="flex items-center justify-between gap-4">
                  Alertes maintenance
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="flex items-center justify-between gap-4">
                  Versements recus
                  <input type="checkbox" defaultChecked />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
