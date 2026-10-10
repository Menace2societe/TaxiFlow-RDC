export type PendingAlert = {
  /** Clé de déduplication : la même alerte n'est jamais envoyée deux fois. */
  key: string;
  text: string;
};

const MAX_LISTED = 6;

/** Un seul message par investisseur et par jour, quelle que soit la quantité d'alertes. */
export function composeAlertMessage(alerts: PendingAlert[], link: string | null): string {
  const listed = alerts.slice(0, MAX_LISTED).map((alert) => alert.text);
  const more = alerts.length > MAX_LISTED ? ` (+${alerts.length - MAX_LISTED} autre(s))` : "";
  const intro = alerts.length === 1 ? "1 alerte" : `${alerts.length} alertes`;
  return `${intro} : ${listed.join(" ; ")}${more}.${link ? ` Détails : ${link}` : ""}`;
}
