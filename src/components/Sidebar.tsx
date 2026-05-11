"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CarTaxiFront,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  UserCog,
  UserRound,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/lib/supabase/types";

const navItems = {
  driver: [
    { href: "/driver/dashboard", label: "Mes Recettes", icon: ReceiptText },
    { href: "/driver/maintenance", label: "Maintenance Moto/Taxi", icon: Wrench },
    { href: "/driver/profile", label: "Mon Profil", icon: UserRound }
  ],
  investor: [
    { href: "/investor/dashboard", label: "Etat de la Flotte", icon: CarTaxiFront },
    { href: "/investor/fleet", label: "Flotte Investie", icon: CarTaxiFront },
    { href: "/investor/revenue", label: "Revenus", icon: BarChart3 },
    { href: "/investor/documents", label: "Documents Legaux", icon: FileText }
  ],
  admin: [
    { href: "/dashboard/overview", label: "Vue generale", icon: LayoutDashboard },
    { href: "/dashboard/entries", label: "Recettes", icon: ClipboardList },
    { href: "/dashboard/fleet", label: "Flotte", icon: CarTaxiFront },
    { href: "/dashboard/users", label: "Utilisateurs", icon: UserCog },
    { href: "/dashboard/reports", label: "Rapports globaux", icon: ShieldCheck }
  ]
} satisfies Record<UserRole, Array<{ href: string; label: string; icon: LucideIcon }>>;

type SidebarProps = {
  role: UserRole;
  name?: string | null;
};

export function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems[role];

  return (
    <aside className="flex h-full w-full flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
        <Link href={items[0]?.href ?? "/"} className="text-lg font-bold text-ink dark:text-stone-50">
          TaxiFlow RDC
        </Link>
        <p className="mt-1 text-xs capitalize text-stone-500 dark:text-stone-400">
          {name ?? role} · portail {role}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {((navItems as any)[role] || []).map((item: any) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-ink dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-50",
                active && "bg-palm/10 text-palm dark:text-emerald-300"
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post" className="border-t border-stone-200 p-3 dark:border-stone-800">
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900" type="submit">
          <LogOut size={18} aria-hidden />
          Deconnexion
        </button>
      </form>
    </aside>
  );
}
