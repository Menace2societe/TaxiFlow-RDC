import { Barlow, Barlow_Condensed } from "next/font/google";

/** Polices de l'univers « plaque » (espaces chauffeur et investisseur). */
export const streetFont = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-street", display: "swap" });
export const plateFont = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-plate", display: "swap" });
