import type { Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { DriverRail, DriverTabBar } from "@/components/driver/DriverNav";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import { requireRole } from "@/lib/auth/roles";

const street = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-street", display: "swap" });
const plate = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-plate", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#f7f7f2"
};

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("driver");

  return (
    <div className={`plate-world ${street.variable} ${plate.variable} min-h-screen`}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[230px_1fr]">
        <DriverRail name={profile.full_name || "Chauffeur"} />
        <main className="min-w-0 pb-28 md:pb-12">
          <SupabaseRealtimeRefresh />
          <div className="mx-auto w-full max-w-xl px-4 pt-4 md:px-8 md:pt-8">{children}</div>
        </main>
      </div>
      <DriverTabBar />
    </div>
  );
}
