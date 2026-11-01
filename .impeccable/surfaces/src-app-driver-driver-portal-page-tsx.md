---
version: 1
slug: "src-app-driver-driver-portal-page-tsx"
primary_target: "src/app/(driver)/driver/portal/page.tsx"
related_targets: ["src/app/(driver)/driver/dashboard/page.tsx","src/app/(driver)/driver/maintenance/page.tsx","src/app/(driver)/driver/documents/page.tsx","src/app/(driver)/driver/profile/page.tsx"]
---

# Espace chauffeur

Scope: driver space (`/driver/*`), mobile-first PWA. Mode: Operate.

Audience: taxi and moto-taxi drivers in Kinshasa, on the phone, outdoors, weak network. Job: declare today's versement (km, photo, amount), pay by Mobile Money, report breakdowns, see vehicle, documents and contract. Constraints: no change to server actions, data flow or RLS; French copy; offline queue states stay explicit. Must not feel folkloric.

## Direction contract

THESIS: The vehicle is its plate, and today's versement is the sticker on it. Refuses the dark fintech dashboard with glowing KPI cards and icon tiles.

OWN-WORLD: Reflective plate white ground (#f7f7f2), ink black for all readable text (no pale grey), plate-blue band (#1f4fb4) used only for the plate band and the primary action, vignette yellow (#f2c230) for today's status panel. Barlow Condensed for plate numerals, amounts and headings; Barlow for body. One fixed marker per state: validated filled green dot, pending amber ring, rejected red diamond, not declared dashed ring.

STORY: The driver sees which vehicle, whether today is declared, what is owed, and acts in one tap; below, the week's days compare at one scale.

FIRST VIEWPORT: Greeting + day's USD rate; full-width plate (CGO band, plate number ~58px); vehicle model + status; yellow "Aujourd'hui" panel with status headline, expected amount, blue "Déclarer mon versement" button and Mobile Money link; then "Cette semaine" rows. Bottom tab bar: Aujourd'hui, Versements, Véhicule, Moi.

FORM: Plaque d'immatriculation RDC, candidate 4 of 7, seed:cafa72c758ca2f00.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Raises
- Ikeda: two inks only for readable text.
- Transit: fixed state markers everywhere.
- Botanical folio: history days at one shared scale.
- Monochrome: blue reserved for plate band and primary action.
- Saville: the plate is the only headline; no "Portail chauffeur" title, no decorative badge.

## Adaptations
- Tab bar has 5 tabs (Aujourd'hui, Recettes, Pannes, Papiers, Moi) instead of the contract's 4: they map one-to-one to the existing driver routes (portal, dashboard, maintenance, documents, profile), so no screen was merged or dropped.
- The red diamond marker means "blocking problem" across domains: a rejected versement, or a breakdown not yet repaired. Ring = waiting, filled dot = settled, dashed ring = nothing.
- Secondary tabs with a vehicle (Recettes, Pannes) open on the small plate with a visually hidden h1; Papiers and Moi have no plate to show and keep a visible h1.

## Unresolved
- Investor and admin spaces keep the old look for now.
