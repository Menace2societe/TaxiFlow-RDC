import { Sidebar } from "@/components/Sidebar";
import { requireRole } from "@/lib/auth/roles";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("investor");

  return (
    <div className="min-h-screen bg-road text-ink dark:bg-[#101815] dark:text-stone-50">
      <div className="md:hidden">
        <Sidebar role="investor" name={profile.full_name} />
      </div>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        <div className="hidden md:block">
          <Sidebar role="investor" name={profile.full_name} />
        </div>
        <main className="min-w-0 px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
