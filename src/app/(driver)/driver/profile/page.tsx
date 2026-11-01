import { ChangePasswordForm } from "@/components/driver/ChangePasswordForm";
import { SignOutButton } from "@/components/driver/SignOutButton";
import { getCurrentProfile } from "@/lib/auth/roles";

export default async function DriverProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="pb-6">
      <h1 className="font-plate text-[26px] font-bold leading-tight">Mon profil</h1>
      <dl className="mt-3 border-b-2 border-plate-rule text-[16px]">
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-plate-rule py-3">
          <dt>Nom</dt>
          <dd className="text-right font-bold">{profile?.full_name || "Non renseigné"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-plate-rule py-3">
          <dt>Téléphone</dt>
          <dd className="text-right font-bold">{profile?.phone || "Non renseigné"}</dd>
        </div>
      </dl>

      <section aria-labelledby="code-title" className="mt-10">
        <h2 id="code-title" className="font-plate text-[26px] font-bold">
          Mon code de connexion
        </h2>
        <p className="mt-1 text-[16px]">
          Remplacez le code donné par votre investisseur par un code que vous seul connaissez. 8 caractères au moins.
        </p>
        <ChangePasswordForm />
      </section>

      {/* Sur téléphone, la barre d'onglets n'a pas de bouton de déconnexion. */}
      <section aria-label="Déconnexion" className="mt-10 border-t-2 border-plate-rule pt-6 md:hidden">
        <SignOutButton />
      </section>
    </div>
  );
}
