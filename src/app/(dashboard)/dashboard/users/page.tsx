import { ShieldCheck, UserCog } from "lucide-react";
import { UserRoleForm } from "@/components/admin/UserRoleForm";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_owner_driver: boolean;
  created_at: string;
};

const roleLabels: Record<UserRole, string> = {
  driver: "Chauffeur",
  investor: "Investisseur",
  admin: "Administrateur"
};

export default async function UsersPage() {
  let profiles: ProfileRow[] = [];
  let errorMessage: string | null = null;

  // La policy profiles_related_read donne à l'admin la lecture de tous les profils.
  const [currentProfile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,is_owner_driver,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[UsersPage]", error.message);
    errorMessage = "Impossible de charger les utilisateurs.";
  }
  profiles = data ?? [];

  const adminCount = profiles.filter((profile) => profile.role === "admin").length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Controle admin</p>
        <h1 className="mt-1 text-3xl font-semibold">Gestion des utilisateurs</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {profiles.length} compte(s), dont {adminCount} administrateur(s). Vous ne pouvez pas changer votre propre
          rôle : demandez à un autre administrateur.
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">{errorMessage}</p>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserCog size={20} aria-hidden />
            Comptes
          </h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {profiles.map((profile) => {
            const name = profile.full_name ?? "Utilisateur sans nom";
            const isSelf = profile.id === currentProfile?.id;

            return (
              <article className="flex flex-col justify-between gap-3 px-5 py-4 md:flex-row md:items-center" key={profile.id}>
                <div>
                  <p className="font-semibold">
                    {name}
                    {isSelf ? <span className="ml-2 text-xs font-normal text-stone-400">(vous)</span> : null}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {profile.phone ?? "Telephone non renseigne"}
                    {profile.is_owner_driver ? " · chauffeur-propriétaire" : ""}
                  </p>
                </div>
                {isSelf ? (
                  <span className="inline-flex w-fit items-center gap-2 rounded-md bg-palm/10 px-3 py-2 text-sm font-semibold text-palm dark:text-emerald-300">
                    <ShieldCheck size={16} aria-hidden />
                    {roleLabels[profile.role]}
                  </span>
                ) : (
                  <UserRoleForm userId={profile.id} currentRole={profile.role} userName={name} />
                )}
              </article>
            );
          })}
          {profiles.length === 0 ? <p className="px-5 py-8 text-center text-sm text-stone-400">Aucun profil trouve.</p> : null}
        </div>
      </section>
    </div>
  );
}
