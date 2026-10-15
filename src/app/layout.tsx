import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxiFlow RDC",
  description: "Gestion des revenus et de la flotte taxi-moto a Kinshasa",
  applicationName: "TaxiFlow RDC",
  appleWebApp: { capable: true, title: "TaxiFlow", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0b1210",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
