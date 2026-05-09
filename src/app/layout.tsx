import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxiFlow RDC",
  description: "Gestion des revenus et de la flotte taxi-moto a Kinshasa"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
