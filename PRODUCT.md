# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA (Next.js 14, Tailwind 3, Supabase), used mostly on phones.

## Users

- **Chauffeurs (priority for the redesign)**: taxi and moto-taxi drivers in Kinshasa (and Lubumbashi). They use the app on their phone, on the road, often outdoors in strong sunlight, with weak or no network. Many have no email. Their job: declare the day's takings (versement) with start/end odometer and a photo of the meter, pay by Mobile Money, report breakdowns, see their documents and their contract (employee or lease-to-own).
- **Investisseurs**: vehicle owners who follow revenue, validate or reject versements, review fraud alerts, manage fleet, drivers, expenses, contracts and document deadlines.
- **Administrateur**: platform operator (users, fleet, entries, reports).

## Product Purpose

Fleet management for taxis and motos-taxis in the DRC. Drivers declare what they earned; investors see what each vehicle brings in and are protected against under-declared takings. Success: drivers declare every day without friction, and investors trust the numbers.

## Positioning

Built for Kinshasa rather than adapted to it: amounts in CDF with the day's USD rate, Kinshasa time, +243 numbers, drivers without email (number + access code), offline queue for versements, Mobile Money (M-Pesa, Airtel Money, Orange Money via pawaPay), and odometer-based fraud control (suspicious entries, kilometres driven outside the app, odometer going backwards).

## Operating Context

- Driver workflow: one versement per day (amount, currency, km départ / km arrivée, meter photo), then cash handover or Mobile Money payment; breakdown declaration → repair → resolved.
- Investor workflow: validate/reject (reason required), manual cash entry, Contrôle & alertes with photo evidence, monthly profit per vehicle, CSV export, daily WhatsApp summary.
- Login: one login, middleware redirects by role (`/driver`, `/investor`, `/dashboard`); SMS/WhatsApp OTP or number + access code.

## Capabilities and Constraints

- Interface in French; currency CDF/USD; dates follow the fleet's timezone.
- Must work offline for already-opened pages and queue versements (photo included).
- Security lives in Postgres RLS; the redesign must not change actions, data flows or permissions.
- Theme: currently dark ("lisible en plein soleil" in the README). The user left the theme open for the redesign; outdoor legibility is the requirement, not darkness.

## Brand Commitments

Name "TaxiFlow RDC". No fixed logo, no binding palette or typography. The user asked for an interface that feels human and specific to this product rather than a generic AI template.

## Evidence on Hand

None. No logo, no real photos of vehicles or drivers, no real customers, figures or testimonials. Future work must not invent any of these.

## Product Principles

1. The driver on the road comes first: one hand, sunlight, bad network, little time.
2. Speak like a person from Kinshasa would: plain French, real terms (versement, recette, compteur, carte rose), no jargon.
3. Trust through visible proof: kilometres, photos and statuses are shown plainly, never hidden behind decoration.
4. Nothing is lost: offline and pending states are always explicit.

## Accessibility & Inclusion

Large touch targets, high contrast outdoors, readable on low-end Android phones; drivers may have limited reading comfort, so short labels and clear numbers matter.
