/**
 * Connexion des chauffeurs créés par téléphone, sans SMS.
 *
 * Supabase ne sait pas connecter un compte « téléphone seul » sans fournisseur SMS
 * payant. On donne donc à ces comptes un identifiant email technique dérivé du
 * numéro (jamais utilisé pour envoyer du courrier) et un code d'accès que
 * l'investisseur transmet au chauffeur. Le chauffeur se connecte avec son
 * numéro + ce code.
 */

const DEFAULT_LOGIN_DOMAIN = "chauffeurs.taxiflow.invalid";

/** "+243 81 234 5678", "0812345678", "243812345678", "812345678" → "+243812345678". */
export function normalizeDrcPhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/[\s().-]/g, "");
  let national: string | null = null;

  if (/^\+243\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^00243\d{9}$/.test(digits)) national = digits.slice(5);
  else if (/^243\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;

  return national ? `+243${national}` : null;
}

export function driverLoginEmail(normalizedPhone: string, domain = process.env.DRIVER_LOGIN_EMAIL_DOMAIN): string {
  return `${normalizedPhone.replace(/^\+/, "")}@${domain || DEFAULT_LOGIN_DOMAIN}`;
}

// Sans 0/O, 1/I/L : lisible au téléphone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Code d'accès de 8 caractères (~39 bits), tiré au hasard cryptographique. */
export function generateAccessCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

/** "K7M2P9QX" → "K7M2-P9QX" pour l'affichage. */
export function formatAccessCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Le chauffeur peut taper le code avec ou sans tiret, en minuscules. */
export function normalizeAccessCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}
