---
name: TaxiFlow RDC
description: The driver's space as a DRC license plate - reflective white ground, ink-black text, a blue plate band, and today's versement as a yellow vignette.
colors:
  plate-ground: "#f7f7f2"
  plate-white: "#ffffff"
  plate-ink: "#111111"
  plate-soft: "#3b3b36"
  plate-rule: "#d6d6cc"
  plate-band: "#1f4fb4"
  plate-band-dark: "#173d8c"
  vignette: "#f2c230"
  vignette-deep: "#e5b420"
  state-ok: "#17703d"
  state-wait: "#8f5000"
  state-bad: "#b3261e"
typography:
  plate-numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.5rem, 13vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.03em"
  price:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
  page-title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.25
  title-sm:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  figure:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
  figure-lg:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
  lead:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
  caption:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  button:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.375
  nav:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "4px"
  md: "8px"
  plate: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.plate-band}"
    textColor: "{colors.plate-white}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.plate-band-dark}"
  button-secondary:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.plate-ground}"
  button-warning:
    backgroundColor: "{colors.vignette}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    height: "52px"
  button-warning-hover:
    backgroundColor: "{colors.vignette-deep}"
  button-danger:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.state-bad}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-danger-hover:
    backgroundColor: "{colors.state-bad}"
    textColor: "{colors.plate-white}"
  toggle-active:
    backgroundColor: "{colors.plate-ink}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.lg}"
    height: "52px"
  field:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "52px"
  card:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  today-vignette:
    backgroundColor: "{colors.vignette}"
    textColor: "{colors.plate-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.xl}"
    padding: "16px 20px 20px"
  license-plate:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.plate-ink}"
    typography: "{typography.plate-numeral}"
    rounded: "{rounded.plate}"
    height: "96px"
  license-plate-band:
    backgroundColor: "{colors.plate-band}"
    textColor: "{colors.plate-white}"
    width: "48px"
  badge:
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  tab-bar:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.plate-ink}"
    typography: "{typography.nav}"
    height: "68px"
  tab-bar-active:
    textColor: "{colors.plate-band}"
  rail-item-active:
    backgroundColor: "{colors.plate-band}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: TaxiFlow RDC

## Overview

**Creative North Star: "The Plate and the Vignette"**

The driver's space is built as a Congolese license plate read in full sun. The vehicle *is* its plate: a white, double-framed plate with a blue "CGO" band is the only headline on the home screen, and today's versement sits under it as a yellow vignette, the sticker you would glue to a windscreen. Everything else is printed in ink-black on a reflective off-white ground, in a condensed plate face for numbers and headings and a plain street face for reading. The world is flat, high-contrast and literal: kilometres, amounts and statuses are shown plainly, never inside glowing KPI tiles.

Density is low and vertical. One column, one hand, big targets (52-56px controls), and history laid out as rows at a single shared scale so days compare at a glance. State is carried by four fixed markers (filled dot, ring, diamond, dashed ring) that mean the same thing on every screen, always paired with a French word ("Validé", "En attente de validation", "Rejeté", "Rien déclaré"). The voice is plain Kinshasa French addressed to the driver: "Mbote, Patrick", "Déclarer mon versement", "Notez le compteur avant de rendre le véhicule."

The direction explicitly refuses the dark fintech dashboard with glowing KPI cards and icon tiles, and it must not feel folkloric: the plate is a real, everyday object, not a flag or a pattern.

**Scope.** This world is applied to the public landing page (`/`), the driver space (`/driver/*`) and the investor space (`/investor/*`), each wrapped in the `plate-world` class by its layout. Drivers get a bottom tab bar on phones; investors, with nine sections, get a top bar with a "Menu" toggle on phones; both get the same 230px rail from 768px. In the investor space every vehicle is identified by its plate (`PlateChip` in dense rows, `LicensePlate size="sm"` elsewhere), and the single yellow panel per screen holds what needs the investor's action now. The admin space (`/dashboard`) still runs the incumbent dark look (near-black gradient, Inter, emerald buttons, blurred neutral cards, uppercase tracked labels, legacy `ink/palm/copper/river/road` colors and `shadow-soft`). That look is legacy, not the system: new surfaces and the future admin redesign extend the plate world. Tailwind's `dark:` variant never applies inside `.plate-world`, so components shared with the admin carry both looks during the transition.

**Key Characteristics:**
- The plate is the hero and the identity; no logo, no "Portail chauffeur" title.
- Two inks for reading: plate ink on light grounds, plate white on the blue band and on filled ink buttons.
- Blue means "the plate, the main action, and where you are".
- Yellow means "today" (and the breakdown report).
- One fixed marker per state, everywhere, always with a word.
- Flat surfaces, 2px borders, rows instead of cards for history.
- Condensed numerals with tabular figures for every amount.

## Colors

A sunlit plate palette: near-white ground, near-black ink, one saturated blue, one signal yellow, and three state colors that only ever mark state.

### Primary
- **Plate Band Blue** (`plate-band`): the CGO band on the license plate, the primary action button ("Déclarer mon versement", "Remettre en service"), the active tab and active rail item, the keyboard focus outline, field focus border and caret. 7.4:1 under white text.
- **Deep Band Blue** (`plate-band-dark`): hover/pressed state of the primary button. Never a fill on its own.

### Secondary
- **Vignette Yellow** (`vignette`): the "Aujourd'hui" status panel, the warning button used for "Signaler la panne", and the text selection highlight. Ink on it reads at 11.3:1.
- **Pressed Vignette** (`vignette-deep`): hover of the yellow button only.

### Tertiary (state)
- **Validated Green** (`state-ok`): the filled dot for "Validé", "En service" and success notices.
- **Pending Amber** (`state-wait`): the ring for "En attente de validation", "En réparation", "Réparation en cours".
- **Rejected Red** (`state-bad`): the diamond for "Rejeté" and open breakdowns, error notices, the danger button, and the bar of a rejected day in the week rows.

All three clear 6:1 on white, so they also work as text color in notices and badges.

### Neutral
- **Reflective Plate Ground** (`plate-ground`): the page background and the PWA `themeColor`; also the hover fill of secondary buttons and rail items.
- **Plate White** (`plate-white`): the plate face, cards, fields, the tab bar and rail, notices.
- **Plate Ink** (`plate-ink`): all readable text, 2px borders on fields, secondary buttons and the plate frame, the week bars, the active state toggle fill. 17.6:1 on the ground.
- **Road Soft** (`plate-soft`): a second, dark-grey ink (10.5:1) used sparingly for sub-lines (counts, dates, the driver name in the rail, the empty plate placeholder). It is not a pale grey and must not get lighter.
- **Plate Rule** (`plate-rule`): row dividers, card borders, the empty track behind week bars (at 60%). Decorative only; never text.

### Named Rules
**The Two Inks Rule.** Readable text is plate ink, or plate white on band blue and filled ink. Road Soft is the only allowed secondary ink; no lighter greys, no colored body text outside notices.

**The Band Rule.** Blue is the plate band, the one main action per view, and "you are here" (active nav, focus). It is never a decorative fill, a heading color or a chart color.

**The Sticker Rule.** Yellow belongs to today's versement panel and to reporting a breakdown. A second yellow surface on the same screen is wrong; the "Démarrer la réparation" button is deliberately turned white for this reason.

## Typography

**Display Font:** Barlow Condensed 600/700 (with Arial Narrow, sans-serif), loaded via `next/font` as `--font-plate`
**Body Font:** Barlow 400/500/600/700 (with system-ui, sans-serif), loaded via `next/font` as `--font-street`

**Investor and landing steps.** **Page title** (700, 30px) is the visible h1 of investor pages. **Figure large** (700, 22px) sets amounts in figures rows. **Lead** (400, 18px, 1.625) is the landing page's introductory paragraph. **Price** (700, 64px) is the one large price in the landing's yellow example panel. Landing headlines are fluid (`clamp`, up to 4.25rem for the h1, 3rem for section titles).

**Character:** Barlow Condensed is the plate stencil: narrow, upright, numeric-first, built for amounts and the plate number. Barlow is its everyday sibling, a plain grotesque sized up for outdoor reading. Tabular figures are on for the whole world so amounts line up.

### Hierarchy
- **Plate numeral** (700, clamp 40-60px; 32-44px for long numbers; 28px on the small plate; line-height 1; +0.03em): the plate number only. Province code sits at half size, baseline-shifted.
- **Headline** (700, 34px, 1.05): the today vignette's status ("Pas encore déclaré", "Versement validé", "Véhicule à l'arrêt"). One per screen.
- **Title** (700, 26px, 1.25): section headings ("Déclarer mon versement", "Signaler une panne") and the visible h1 of Papiers and Moi (pages without a plate). **Title small** (700, 24px): sub-sections such as "Les 7 derniers jours".
- **Figure** (Barlow Condensed 700, 21px): amounts in history rows, right-aligned, min 96px wide; larger summary amounts use the same face.
- **Body** (400, 16px, 1.375): explanatory sentences, with key values in bold ("versement attendu : **60 000 FC**").
- **Label** (600, 15px): form labels, greeting line, notices, vehicle status. Sentence case, no tracking.
- **Caption** (600, 14px): state words under week rows, the weekly validated total.
- **Button** (700, 17px primary; 700, 16px secondary/warning).
- **Nav** (600, 13px): tab bar labels under 24px icons.

### Named Rules
**The Plate Face Rule.** Barlow Condensed is for the plate, headings and numbers. Sentences and labels are always Barlow.

**The No Shouting Rule.** Labels are sentence case at normal tracking; the plate world resets the legacy uppercase, letter-spaced section labels. Nothing below 13px.

## Layout

A single centered column, max 576px wide, with 16px side gutters on phones and 32px from the `md` breakpoint (768px). On phones a fixed bottom tab bar (68px plus safe-area inset) carries navigation, and the content reserves 112px of bottom padding for it. From `md` up the tab bar is replaced by a sticky 230px left rail with a 2px ink right border; the content column stays the same narrow width rather than stretching to fill the desktop.

The home screen reads top-down in a fixed order: greeting and day's USD rate on one line, any alert, the full-width plate, the vehicle model and status line, the yellow today vignette, then the week rows, then the forms ("Déclarer mon versement", "Payer par Mobile Money", "État du véhicule", "Signaler une panne"). Vertical rhythm steps 8 / 12 / 16 / 20 / 32 / 40px: 20px between the plate block and the vignette, 32px before the week, 40px between form sections. Anchored sections use a 16px scroll margin.

**The One Scale Rule.** Days in history are rows sharing one scale: the maximum of the daily target and the largest day. Each row is a 64px day label, a 12px bar on a rule-colored track, and the right-aligned figure, with the state marker and word indented 76px underneath. Never per-day cards, never per-row scaling.

## Elevation & Depth

The world is flat. Depth comes from 2px borders and the contrast between ground, white surfaces and the yellow vignette, not from shadows. Cards, fields, notices, the tab bar and the rail have no shadow and no blur.

### Shadow Vocabulary
- **Plate frame** (`box-shadow: inset 0 0 0 3px #ffffff, inset 0 0 0 5px #111111, 0 2px 6px rgba(17,17,17,0.12)`): the double embossed frame of the license plate plus a barely-there lift. Only the plate carries it.

The primary button is flat too: no lip, no offset shadow; pressing darkens it to Deep Band Blue.

### Named Rules
**The Flat Plate Rule.** Only the plate has a frame shadow. Everything else separates with a 2px border or a ground change.

## Shapes

Rounded rectangles with firm 2px borders, like stamped metal and printed paper. Corner radii step with the object's size: 4px on bar ends, 8px on fields, notices and rail items, 10px on the plate, 12px on buttons, cards and the breakdown panel, 16px on the today vignette, fully round on badges and dot/ring markers. Borders are 2px everywhere that a border exists (3px on the plate and the pending ring). The "no vehicle yet" placeholder uses a 2px dashed ink border, echoing the dashed "not declared" marker.

The four state markers are fixed geometry at 14px: a filled green circle (validated), a 3px amber ring (pending), a 12px red square rotated 45 degrees (rejected), and a 2px dashed ink ring (not declared). Shape, not color alone, carries the state.

## Components

### Buttons
Big, blunt and thumb-sized.
- **Shape:** gently rounded (12px), full width in forms.
- **Primary:** band blue, white 17px bold text, 56px minimum height, flat; hover and press to Deep Band Blue. One per view.
- **Secondary:** white with a 2px ink border, ink 16px bold text, 52px; hover to the ground color.
- **Warning:** vignette yellow with a 2px ink border, ink text, 52px; used for "Signaler la panne". A `repair-start` variant swaps the fill to white so the yellow stays unique.
- **Danger:** white with a 2px red border and red text; hover fills red with white text.
- **Segmented toggle:** "État du véhicule" uses three 52px bordered buttons in a 3-column grid; the current state fills ink with white text (`aria-pressed`).
- **Text actions:** secondary links like "Payer par Mobile Money" and "Toutes mes recettes" are bold 16px underlined text (3-4px offset) with 8px vertical padding, not buttons.
- **Focus:** 3px solid band-blue outline at 2px offset on every focusable element.

### Chips / Badges
- **Style:** fully round, transparent fill, 2px colored border and matching bold 13px text (green, amber, red, ink at 40% border, blue).
- **State:** prefer the StateMark plus word over a badge for payment and vehicle states.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** plate white on the ground.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 2px plate rule; the active breakdown panel uses a 2px ink border.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** white, 2px ink border at 70%, 8px radius, 52px minimum height, 17px ink text, Road Soft placeholder.
- **Focus:** border turns band blue with a 2px band-blue ring at 25%; caret is band blue.
- **Hover:** border goes full ink. File inputs get a solid ink "choose file" button.
- **Labels:** 15px semibold above the field with 6px gap, written as plain questions ("Ce qui s'est passé", "Coût estimé en FC (si vous le savez)").

### Notices
Inline alerts under the greeting: white, 2px border and 15px semibold text in the state's color (red for errors with `role="alert"`, green for "Versement envoyé.", ink for "Panne signalée…"), with an 18px line icon.

### Navigation
- **Phone:** fixed bottom tab bar, white with a 2px ink top border, five equal tabs ("Aujourd'hui", "Recettes", "Pannes", "Papiers", "Moi"), 24px line icons over 13px semibold labels, 68px tall. Active tab turns band blue, thickens its icon stroke and shows a 32x4px blue bar under the label.
- **Desktop/tablet:** sticky 230px white rail with "TaxiFlow RDC" in the plate face and the driver's name, 48px rows with 20px icons; the active row fills band blue with white text, others hover to the ground. "Se déconnecter" sits at the bottom above a 2px rule.

### License Plate (signature)
A white plate with a 3px ink border and the double inset frame, 96px tall (56px small variant used on secondary pages). A 48px band-blue strip on the left carries "CGO" in white condensed bold at its foot. The number is split into number and province ("4821 BK" + "01" at half size) when it matches the DRC pattern, otherwise shown as entered; an empty plate shows "— — —" in Road Soft. It is the only headline of every screen that shows a vehicle (Aujourd'hui, Recettes, Pannes: the h1 is screen-reader only).

### Today Vignette (signature)
A yellow panel with 16px radius and 16/20/20px padding: the status headline in 34px condensed bold (preceded by a 16px state marker once declared), a 16px sentence with the long date and the expected or declared amount in bold, then the primary "Déclarer mon versement" button and the "Payer par Mobile Money" text link when action is needed. It sticks on once at load: 420ms, `cubic-bezier(0.16, 1, 0.3, 1)`, from 6px up, rotated -1.2 degrees and 98.5% scale, like a sticker being pressed on. Disabled under reduced motion.

### Week Rows (signature)
See The One Scale Rule in Layout. Bars are ink (red when rejected) on a 60% rule track, 12px tall with 4px ends; figures use thin-space grouping (`fr-CD`) and "—" for empty days.

## Do's and Don'ts

### Do:
- **Do** make the plate the first and largest thing on a vehicle screen, with the CGO band in Plate Band Blue.
- **Do** write every readable word in plate ink (#111111) or plate white on blue/ink; use Road Soft (#3b3b36) only for sub-lines.
- **Do** show every payment, vehicle and breakdown state with its fixed marker (dot, ring, diamond, dashed ring) and its French word.
- **Do** compare days as rows on one shared scale, with condensed tabular figures right-aligned.
- **Do** keep touch targets at 52px minimum (56px for the primary action) and text at 13px minimum.
- **Do** separate surfaces with 2px borders and ground changes, not shadows.
- **Do** keep one primary blue action per view and reserve yellow for today's vignette and breakdown reporting.
- **Do** extend this world, not the legacy dark look, when building new screens or redesigning the investor and admin spaces.

### Don't:
- **Don't** build dark fintech dashboards with glowing KPI cards, icon tiles, gradients or blur.
- **Don't** add a page title or decorative badge above the plate on the home screen; the plate is the headline.
- **Don't** use blue for headings, charts or decoration, or yellow for anything other than today and the breakdown report.
- **Don't** use pale grey text, uppercase tracked labels, or text below 13px.
- **Don't** invent new state colors or shapes, or show a state by color alone.
- **Don't** give history entries their own cards or their own scales.
- **Don't** make it folkloric: the plate, a real everyday object, is the world's only local reference; add no decorative motifs around it.
