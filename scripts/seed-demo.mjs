/**
 * Compte de démonstration TaxiFlow : un investisseur fictif avec 4 véhicules,
 * 4 chauffeurs et 30 jours d'activité (versements, alertes kilométriques, km non
 * déclarés, jour sans recette, dépenses, location-vente, documents qui expirent).
 *
 * Usage (lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY) :
 *   node --env-file=.env.local scripts/seed-demo.mjs          → aperçu, n'écrit rien
 *   node --env-file=.env.local scripts/seed-demo.mjs --yes    → crée / réinitialise la démo
 *
 * Relançable : les données du compte démo sont effacées puis recréées.
 * Variables optionnelles : DEMO_EMAIL, DEMO_PASSWORD, DEMO_EMAIL_DOMAIN.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.argv.includes("--yes");

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (node --env-file=.env.local …).");
  process.exit(1);
}

const domain = process.env.DEMO_EMAIL_DOMAIN || "taxiflow-demo.invalid";
const investorEmail = process.env.DEMO_EMAIL || `demo.investisseur@${domain}`;
const password = process.env.DEMO_PASSWORD || `Demo-${randomBytes(6).toString("base64url")}`;

const DAYS = 30;
const vehicles = [
  { key: "ist", label: "Toyota Ist", plate: "KN-DEMO-01", type: "taxi", target: 55000 },
  { key: "corolla", label: "Toyota Corolla", plate: "KN-DEMO-02", type: "taxi", target: 60000 },
  { key: "tvs", label: "Moto TVS", plate: "KN-DEMO-03", type: "moto", target: 20000 },
  { key: "haojue", label: "Moto Haojue", plate: "KN-DEMO-04", type: "moto", target: 18000 }
];
const drivers = [
  { key: "ist", name: "Jean-Marie Kabeya (démo)", phone: "+243000000101" },
  { key: "corolla", name: "Patrick Mbuyi (démo)", phone: "+243000000102" },
  { key: "tvs", name: "Héritier Ilunga (démo)", phone: "+243000000103" },
  { key: "haojue", name: "Glody Tshibangu (démo)", phone: "+243000000104" }
];

console.log(`Compte démo : ${investorEmail}`);
console.log(`Base : ${url}`);
console.log(`${vehicles.length} véhicules, ${drivers.length} chauffeurs, ${DAYS} jours d'historique.`);
if (!confirmed) {
  console.log("\nAperçu seulement. Relancez avec --yes pour écrire dans cette base.");
  process.exit(0);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function check(result, step) {
  if (result.error) {
    throw new Error(`${step} : ${result.error.message}`);
  }
  return result.data;
}

/** Date YYYY-MM-DD à Kinshasa, décalée de `offset` jours. */
function kinshasaDate(offset = 0) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa" }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset, 12)).toISOString().slice(0, 10);
}

/** Pseudo-hasard reproductible : la démo est identique à chaque réinitialisation. */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { users } = check(await supabase.auth.admin.listUsers({ page, perPage: 1000 }), "Liste des comptes");
    const found = users.find((user) => user.email === email);
    if (found || users.length < 1000) return found ?? null;
  }
  return null;
}

async function ensureUser(email, metadata) {
  const existing = await findUserByEmail(email);
  if (existing) {
    check(await supabase.auth.admin.updateUserById(existing.id, { password }), `Mot de passe ${email}`);
    return existing.id;
  }
  const { user } = check(
    await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata }),
    `Création ${email}`
  );
  return user.id;
}

// ── Comptes ────────────────────────────────────────────────────────────────
const investorId = await ensureUser(investorEmail, { role: "investor", full_name: "Investisseur Démo", phone: "+243000000100" });
const driverIds = {};
for (const [index, driver] of drivers.entries()) {
  driverIds[driver.key] = await ensureUser(`demo.chauffeur${index + 1}@${domain}`, {
    role: "driver",
    full_name: driver.name,
    phone: driver.phone
  });
}

// ── Remise à zéro ──────────────────────────────────────────────────────────
// Tout est effacé explicitement : en production, supprimer un véhicule
// n'efface pas ses recettes (pas de suppression en cascade).
const cleanup = [
  ["legal_documents", "owner_id"],
  ["driver_contracts", "owner_id"],
  ["mobile_money_transactions", "investor_id"],
  ["notification_log", "owner_id"],
  ["daily_entries", "owner_id"],
  ["payments", "investor_id"],
  ["vehicle_expenses", "owner_id"]
];
for (const [table, column] of cleanup) {
  check(await supabase.from(table).delete().eq(column, investorId), `Nettoyage ${table}`);
}
check(await supabase.from("breakdowns").delete().in("reported_by", Object.values(driverIds)), "Nettoyage pannes");
check(await supabase.from("vehicles").delete().eq("owner_id", investorId), "Nettoyage véhicules");

// ── Véhicules ──────────────────────────────────────────────────────────────
const vehicleRows = check(
  await supabase
    .from("vehicles")
    .insert(
      vehicles.map((vehicle) => ({
        owner_id: investorId,
        driver_id: driverIds[vehicle.key],
        plate_number: vehicle.plate,
        label: vehicle.label,
        type: vehicle.type,
        status: vehicle.key === "corolla" ? "maintenance" : "en service",
        target_daily_revenue: vehicle.target
      }))
    )
    .select("id,plate_number"),
  "Véhicules"
);
const vehicleIdByKey = Object.fromEntries(vehicles.map((vehicle) => [vehicle.key, vehicleRows.find((row) => row.plate_number === vehicle.plate).id]));

// ── Recettes et versements sur 30 jours ──────────────────────────────────────
const random = seededRandom(2026);
const entries = [];
const payments = [];

for (const vehicle of vehicles) {
  let odometer = vehicle.type === "taxi" ? 84000 + Math.round(random() * 20000) : 21000 + Math.round(random() * 8000);

  for (let offset = -DAYS; offset <= -1; offset++) {
    const date = kinshasaDate(offset);
    const isTaxi = vehicle.type === "taxi";
    let distance = Math.round((isTaxi ? 120 : 90) + random() * (isTaxi ? 60 : 50));
    let revenue = Math.round(((isTaxi ? 45000 : 15000) + random() * (isTaxi ? 15000 : 7000)) / 500) * 500;

    // Scénarios de démonstration
    if (vehicle.key === "haojue" && offset === -2) continue; // jour sans recette
    if (vehicle.key === "tvs" && offset === -6) odometer += 70; // 70 km roulés sans recette la nuit
    if (vehicle.key === "ist" && offset === -3) {
      distance = 85;
      revenue = 4000; // recette suspecte
    }
    if (vehicle.key === "corolla" && offset >= -2) continue; // en panne depuis 2 jours

    const start = odometer;
    const end = odometer + distance;
    odometer = end;

    entries.push({
      owner_id: investorId,
      vehicle_id: vehicleIdByKey[vehicle.key],
      driver_id: driverIds[vehicle.key],
      entry_date: date,
      amount: revenue,
      declared_amount: revenue,
      currency: "CDF",
      mileage_km: end,
      start_km: start,
      end_km: end,
      revenue_cdf: revenue
    });

    payments.push({
      amount: revenue,
      driver_id: driverIds[vehicle.key],
      vehicle_id: vehicleIdByKey[vehicle.key],
      investor_id: investorId,
      status: offset >= -1 ? "pending" : "validated",
      source: vehicle.key === "tvs" && offset % 3 === 0 ? "mobile_money" : "automated",
      session_type: "driver_revenue",
      payment_date: date,
      validated_at: offset >= -1 ? null : `${date}T18:00:00Z`
    });
  }
}

check(await supabase.from("daily_entries").insert(entries), "Recettes");
check(await supabase.from("payments").insert(payments), "Versements");

// ── Dépenses ─────────────────────────────────────────────────────────────────
const expenses = [];
for (const vehicle of vehicles) {
  for (let week = 0; week < 4; week++) {
    expenses.push({
      owner_id: investorId,
      vehicle_id: vehicleIdByKey[vehicle.key],
      expense_date: kinshasaDate(-DAYS + week * 7 + 1),
      category: "carburant",
      amount_cdf: vehicle.type === "taxi" ? 95000 : 30000,
      note: "Plein hebdomadaire",
      created_by: investorId
    });
  }
}
expenses.push(
  { owner_id: investorId, vehicle_id: vehicleIdByKey.corolla, expense_date: kinshasaDate(-2), category: "reparation", amount_cdf: 350000, note: "Embrayage", created_by: investorId },
  { owner_id: investorId, vehicle_id: vehicleIdByKey.ist, expense_date: kinshasaDate(-12), category: "entretien", amount_cdf: 60000, note: "Vidange", created_by: investorId },
  { owner_id: investorId, vehicle_id: vehicleIdByKey.tvs, expense_date: kinshasaDate(-20), category: "taxe", amount_cdf: 25000, note: "Vignette", created_by: investorId }
);
check(await supabase.from("vehicle_expenses").insert(expenses), "Dépenses");

// ── Panne en cours ─────────────────────────────────────────────────────────────
check(
  await supabase.from("breakdowns").insert({
    vehicle_id: vehicleIdByKey.corolla,
    reported_by: driverIds.corolla,
    type: "Embrayage",
    description: "Patine en côte, véhicule immobilisé au garage de Limete.",
    estimated_cost: 350000,
    status: "in_progress"
  }),
  "Panne"
);

// ── Contrats ─────────────────────────────────────────────────────────────────
check(
  await supabase.from("driver_contracts").insert([
    {
      owner_id: investorId,
      driver_id: driverIds.tvs,
      vehicle_id: vehicleIdByKey.tvs,
      contract_type: "location_vente",
      status: "active",
      possession_total_cdf: 3500000,
      possession_paid_cdf: 0,
      daily_amount_cdf: 18000,
      started_at: kinshasaDate(-DAYS)
    },
    {
      owner_id: investorId,
      driver_id: driverIds.ist,
      vehicle_id: vehicleIdByKey.ist,
      contract_type: "employe",
      status: "active",
      daily_amount_cdf: 55000,
      started_at: kinshasaDate(-DAYS)
    }
  ]),
  "Contrats"
);

// ── Documents (un PDF minimal par document) ─────────────────────────────────────
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
    "4 0 obj<</Length 52>>stream\nBT /F1 14 Tf 20 60 Td (Document de demonstration) Tj ET\nendstream endobj " +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
);
const documents = [
  { key: "ist", type: "assurance", name: "Assurance Toyota Ist", expires: kinshasaDate(6) },
  { key: "tvs", type: "controle_technique", name: "Contrôle technique Moto TVS", expires: kinshasaDate(-3) },
  { key: "tvs", type: "contrat_location_vente", name: "Contrat location-vente Héritier", expires: null },
  { key: "corolla", type: "carte_rose", name: "Carte rose Toyota Corolla", expires: kinshasaDate(240) }
];
for (const document of documents) {
  const path = `${investorId}/${driverIds[document.key]}/${vehicleIdByKey[document.key]}/demo-${document.type}.pdf`;
  check(
    await supabase.storage.from("documents").upload(path, pdf, { contentType: "application/pdf", upsert: true }),
    `Fichier ${document.name}`
  );
  check(
    await supabase.from("legal_documents").insert({
      owner_id: investorId,
      driver_id: driverIds[document.key],
      vehicle_id: vehicleIdByKey[document.key],
      document_type: document.type,
      document_name: document.name,
      file_url: "",
      storage_path: path,
      expires_at: document.expires
    }),
    `Document ${document.name}`
  );
}

// ── Abonnement : essai en cours ────────────────────────────────────────────────
check(
  await supabase.from("subscriptions").upsert({ owner_id: investorId, trial_ends_at: kinshasaDate(30), paid_until: null }),
  "Abonnement"
);

console.log("\nDémo prête.");
console.log(`  Investisseur : ${investorEmail}`);
console.log(`  Chauffeurs   : demo.chauffeur1@${domain} … demo.chauffeur4@${domain}`);
console.log(`  Mot de passe : ${password}  (le même pour tous les comptes démo)`);
