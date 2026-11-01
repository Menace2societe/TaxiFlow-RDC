"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CarTaxiFront,
  CreditCard,
  FileSignature,
  FileText,
  Gauge,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearOfflineCaches } from "@/components/pwa/ServiceWorkerRegister";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/routes";

const items: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: ROUTES.INVESTOR_DASHBOARD, label: "Aujourd'hui", icon: Gauge },
  { href: ROUTES.INVESTOR_FLEET, label: "Ma flotte", icon: CarTaxiFront },
  { href: ROUTES.INVESTOR_REVENUE, label: "Revenus", icon: BarChart3 },
  { href: ROUTES.INVESTOR_CONTROL, label: "Contrôle", icon: ShieldAlert },
  { href: ROUTES.INVESTOR_EXPENSES, label: "Dépenses", icon: Wallet },
  { href: ROUTES.INVESTOR_CONTRACTS, label: "Contrats", icon: FileSignature },
  { href: ROUTES.INVESTOR_DOCUMENTS, label: "Papiers", icon: FileText },
  { href: ROUTES.INVESTOR_BILLING, label: "Abonnement", icon: CreditCard },
  { href: ROUTES.INVESTOR_SETTINGS, label: "Paramètres", icon: Settings }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
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
  );
}

function SignOut() {
  return (
    <form action={ROUTES.AUTH_SIGNOUT} method="post" onSubmit={clearOfflineCaches}>
      <button
        type="submit"
        className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-base font-semibold text-plate-ink hover:bg-plate-ground"
      >
        <LogOut size={20} aria-hidden />
        Se déconnecter
      </button>
    </form>
  );
}

/** Ordinateur : colonne à gauche, comme l'espace chauffeur. */
export function InvestorRail({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r-2 border-plate-ink bg-plate-white md:flex">
      <div className="px-5 pb-4 pt-6">
        <Link href={ROUTES.INVESTOR_DASHBOARD} className="font-plate text-2xl font-bold text-plate-ink">
          TaxiFlow RDC
        </Link>
        <p className="mt-1 truncate text-sm text-plate-soft">{name}</p>
      </div>
      <nav aria-label="Navigation investisseur" className="flex-1 overflow-y-auto px-3">
        <NavLinks pathname={pathname} />
      </nav>
      <div className="border-t-2 border-plate-rule p-3">
        <SignOut />
      </div>
    </aside>
  );
}

/** Téléphone : barre du haut, le menu se déplie au besoin. */
export function InvestorTopBar({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((item) => isActive(pathname, item.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-40 border-b-2 border-plate-ink bg-plate-white md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate font-plate text-xl font-bold leading-none">{current?.label ?? "TaxiFlow RDC"}</p>
          <p className="truncate text-[13px] text-plate-soft">{name}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="investor-menu"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border-2 border-plate-ink px-3 text-[15px] font-bold"
        >
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          Menu
        </button>
      </div>
      <nav id="investor-menu" aria-label="Navigation investisseur" className={cn("border-t-2 border-plate-rule px-3 py-3", !open && "hidden")}>
        <NavLinks pathname={pathname} />
        <div className="mt-2 border-t-2 border-plate-rule pt-2">
          <SignOut />
        </div>
      </nav>
    </div>
  );
}
