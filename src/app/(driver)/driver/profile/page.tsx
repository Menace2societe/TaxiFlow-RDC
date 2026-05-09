import { getCurrentProfile } from "@/lib/auth/roles";

export default async function DriverProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
      <h1 className="text-2xl font-semibold">Mon Profil</h1>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500 dark:text-stone-400">Nom</dt>
          <dd className="font-medium">{profile?.full_name ?? "Non renseigne"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500 dark:text-stone-400">Telephone</dt>
          <dd className="font-medium">{profile?.phone ?? "Non renseigne"}</dd>
        </div>
      </dl>
    </section>
  );
}
