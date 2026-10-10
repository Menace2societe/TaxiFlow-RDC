import "server-only";

/**
 * Envoi WhatsApp via l'API Cloud de Meta.
 *
 * Hors d'une conversation ouverte par le client, WhatsApp n'autorise que des
 * messages « modèles » approuvés. On utilise un seul modèle générique avec une
 * variable : « Alerte TaxiFlow : {{1}} ».
 *
 * WHATSAPP_TOKEN            jeton d'accès permanent (utilisateur système Meta)
 * WHATSAPP_PHONE_NUMBER_ID  identifiant du numéro expéditeur
 * WHATSAPP_TEMPLATE         nom du modèle (défaut : taxiflow_alerte)
 * WHATSAPP_TEMPLATE_LANG    langue du modèle (défaut : fr)
 */

const GRAPH_VERSION = "v21.0";

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** `to` : numéro international sans "+" (ex. 243812345678). */
export async function sendWhatsAppAlert(to: string, text: string): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return { status: "skipped", error: "WhatsApp non configuré" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: process.env.WHATSAPP_TEMPLATE || "taxiflow_alerte",
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "fr" },
            // Les paramètres de modèle refusent sauts de ligne et longues suites d'espaces.
            components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\s+/g, " ").slice(0, 900) }] }]
          }
        })
      }
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { status: "failed", error: body?.error?.message ?? `HTTP ${response.status}` };
    }
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", error: (error as Error).message };
  }
}
