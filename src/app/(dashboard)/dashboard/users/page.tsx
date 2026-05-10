import { ShieldCheck, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Controle admin</p>
        <h1 className="mt-1 text-3xl font-semibold">Gestion des utilisateurs</h1>
      </header>

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserCog size={20} aria-hidden />
            Profils recents
          </h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {(profiles ?? []).map((profile: any) => (
            <article className="flex flex-col justify-between gap-3 px-5 py-4 md:flex-row md:items-center" key={profile.id}>
              <div>
                <p className="font-semibold">{profile.full_name ?? "Utilisateur sans nom"}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{profile.phone ?? "Telephone non renseigne"}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-palm/10 px-3 py-2 text-sm font-semibold capitalize text-palm dark:text-emerald-300">
                <ShieldCheck size={16} aria-hidden />
                {profile.role}
              </span>
            </article>
          ))}
          {profiles?.length === 0 ? <p className="px-5 py-8 text-center text-sm text-stone-500">Aucun profil trouve.</p> : null}
        </div>
      </section>
    </div>
  );
}
