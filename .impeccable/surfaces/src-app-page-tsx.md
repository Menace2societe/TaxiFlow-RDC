---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Page d'accueil publique

Scope: public landing page `/` (visitors not logged in). Mode: Persuade.

Audience: owners/investors of 1 to 30 taxis or motos-taxis in the DRC. They must believe TaxiFlow shows them, every evening, what each vehicle brought in and who hides trips, and act: start the 30-day trial. Proof: the product itself, demonstrated with example data labelled "exemple". No customers, testimonials, photos or figures may be invented. Content kept: features, 3 steps, pricing from `src/lib/billing/plans.ts`, FAQ, legal links.

## Direction contract

THESIS: A versement travels from the driver's phone to the owner's screen in one minute; the page is that route. Refuses the split hero with a badge row and the grid of identical feature cards.

OWN-WORLD: The plate world from DESIGN.md: plate-white ground, ink text, plate-blue only for the one action and the plate band, vignette yellow for the owner's "today" panel, Barlow Condensed headlines and amounts, 2px ink rules, flat surfaces, the four state marks.

STORY: The owner sees a driver declare (amount, odometer, photo), sees it arrive in his own day panel, understands the fraud check and the price, and starts the trial.

FIRST VIEWPORT: White nav bar (brand, Comment ça marche, Tarifs, Connexion). Headline "Ce que votre chauffeur déclare à 18 h, vous le voyez à 18 h 01." with the blue trial button on the same band. Below, one horizontal route: the driver's phone (plate, amount, two odometer readings, photo, "Envoyer mon versement") at left, a thick ink road carrying the versement chip, the owner's panel at right (yellow "3 sur 4 ont déclaré", plate rows). On phones the route turns vertical.

FORM: Les deux côtés, dealt structure 5 of 7, seed:671c3e80002a7799.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction
On load, the versement chip travels along the road once and the matching row lands in the owner's panel (CSS only, disabled under prefers-reduced-motion, content visible by default). The rest of the page reuses the road as its spine: steps are stops on the same line, and the closing call to action sits at the end of the road.
