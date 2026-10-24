"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CarTaxiFront,
  ClipboardList,
  CreditCard,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserRound,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearOfflineCaches } from "@/components/pwa/ServiceWorkerRegister";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

const navItems = {
  driver: [
    { href: ROUTES.DRIVER_PORTAL, label: "Portail terrain", icon: LayoutDashboard },
    { href: ROUTES.DRIVER_DASHBOARD, label: "Mes Recettes", icon: ReceiptText },
    { href: ROUTES.DRIVER_MAINTENANCE, label: "Maintenance Moto/Taxi", icon: Wrench },
    { href: ROUTES.DRIVER_DOCUMENTS, label: "Documents Legaux", icon: FileText },
    { href: ROUTES.DRIVER_PROFILE, label: "Mon Profil", icon: UserRound }
  ],
  investor: [
    { href: ROUTES.INVESTOR_DASHBOARD, label: "Etat de la Flotte", icon: CarTaxiFront },
    { href: ROUTES.INVESTOR_FLEET, label: "Flotte Investie", icon: CarTaxiFront },
    { href: ROUTES.INVESTOR_REVENUE, label: "Revenus", icon: BarChart3 },
    { href: ROUTES.INVESTOR_CONTROL, label: "Controle & alertes", icon: ShieldAlert },
    { href: ROUTES.INVESTOR_EXPENSES, label: "Depenses & benefice", icon: Wallet },
    { href: ROUTES.INVESTOR_CONTRACTS, label: "Contrats chauffeurs", icon: FileSignature },
    { href: ROUTES.INVESTOR_BILLING, label: "Abonnement", icon: CreditCard },
    { href: ROUTES.INVESTOR_DOCUMENTS, label: "Documents Legaux", icon: FileText },
    { href: ROUTES.INVESTOR_SETTINGS, label: "Parametres", icon: Settings }
  ],
  admin: [
    { href: ROUTES.DASHBOARD_OVERVIEW, label: "Vue generale", icon: LayoutDashboard },
    { href: ROUTES.DASHBOARD_ENTRIES, label: "Recettes", icon: ClipboardList },
    { href: ROUTES.DASHBOARD_FLEET, label: "Flotte", icon: CarTaxiFront },
    { href: ROUTES.DASHBOARD_USERS, label: "Utilisateurs", icon: UserCog },
    { href: ROUTES.DASHBOARD_REPORTS, label: "Rapports globaux", icon: ShieldCheck }
  ]
} satisfies Record<UserRole, Array<{ href: string; label: string; icon: LucideIcon }>>;

type SidebarProps = {
  role: UserRole;
  name?: string | null;
  /** Téléphone : le menu se replie derrière un bouton au lieu d'occuper tout le haut de l'écran. */
  collapsible?: boolean;
};

const roleLabels: Record<UserRole, string> = {
  driver: "Chauffeur",
  investor: "Investisseur",
  admin: "Administrateur"
};

export function Sidebar({ role, name, collapsible = false }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems[role];
  const [open, setOpen] = useState(false);
  const expanded = !collapsible || open;

  // Referme le menu après chaque navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-stone-950 text-stone-100">
      <div className={cn("border-b border-white/10 px-5 py-4", collapsible && "flex items-center justify-between gap-3 py-3")}>
        <div className="min-w-0">
          <Link href={ROUTES.HOME} className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <Image src="/icons/icon.svg" alt="" width={28} height={28} unoptimized className="rounded-lg" />
            TaxiFlow RDC
          </Link>
          <p className="mt-1 truncate text-xs text-stone-400">
            {name ?? roleLabels[role]} · espace {roleLabels[role].toLowerCase()}
          </p>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={`menu-${role}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-semibold text-stone-200"
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            Menu
          </button>
        ) : null}
      </div>
      <nav id={`menu-${role}`} className={cn("flex-1 space-y-1 px-3 py-4", !expanded && "hidden")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-white",
                active && "bg-emerald-500/10 text-emerald-300"
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form
        action={ROUTES.AUTH_SIGNOUT}
        method="post"
        onSubmit={clearOfflineCaches}
        className={cn("border-t border-white/10 p-3", !expanded && "hidden")}
      >
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-300 hover:bg-white/10 hover:text-white" type="submit">
          <LogOut size={18} aria-hidden />
          Deconnexion
        </button>
      </form>
    </aside>
  );
}
