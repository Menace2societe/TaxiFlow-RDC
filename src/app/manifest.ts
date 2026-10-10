import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxiFlow RDC",
    short_name: "TaxiFlow",
    description: "Versements, flotte et contrôle kilométrique des taxis et motos-taxis.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1210",
    theme_color: "#0b1210",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Déclarer un versement", url: "/driver/portal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tableau de bord investisseur", url: "/investor/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }
    ]
  };
}
