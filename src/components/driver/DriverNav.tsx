"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LogOut, ReceiptText, Sun, UserRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearOfflineCaches } from "@/components/pwa/ServiceWorkerRegister";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/routes";

const items: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: ROUTES.DRIVER_PORTAL, label: "Aujourd'hui", icon: Sun },
  { href: ROUTES.DRIVER_DASHBOARD, label: "Recettes", icon: ReceiptText },
  { href: ROUTES.DRIVER_MAINTENANCE, label: "Pannes", icon: Wrench },
  { href: ROUTES.DRIVER_DOCUMENTS, label: "Papiers", icon: FileText },
  { href: ROUTES.DRIVER_PROFILE, label: "Moi", icon: UserRound }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Téléphone : barre d'onglets en bas, à portée du pouce. */
export function DriverTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation chauffeur"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-plate-ink bg-plate-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[68px] flex-col items-center justify-center gap-1 text-[13px] font-semibold text-plate-ink",
                  active && "text-plate-band"
                )}
              >
                <Icon size={24} strokeWidth={active ? 2.6 : 2} aria-hidden />
                {item.label}
                <span className={cn("h-1 w-8 rounded-full", active ? "bg-plate-band" : "bg-transparent")} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Ordinateur ou tablette : colonne à gauche. */
export function DriverRail({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r-2 border-plate-ink bg-plate-white md:flex">
      <div className="px-5 pb-4 pt-6">
        <Link href={ROUTES.DRIVER_PORTAL} className="font-plate text-2xl font-bold text-plate-ink">
          TaxiFlow RDC
        </Link>
        <p className="mt-1 truncate text-sm text-plate-soft">{name}</p>
      </div>
      <nav aria-label="Navigation chauffeur" className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-lg px-3 text-base font-semibold text-plate-ink transition-colors hover:bg-plate-ground",
                    active && "bg-plate-band text-plate-white hover:bg-plate-band"
                  )}
                >
                  <Icon size={20} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={ROUTES.AUTH_SIGNOUT} method="post" onSubmit={clearOfflineCaches} className="border-t-2 border-plate-rule p-3">
        <button
          type="submit"
          className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-base font-semibold text-plate-ink hover:bg-plate-ground"
        >
          <LogOut size={20} aria-hidden />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}
