import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeMobileMoneyTransaction } from "@/lib/mobile-money/finalize";

export const dynamic = "force-dynamic";

/**
 * Callback pawaPay (à configurer dans le tableau de bord pawaPay :
 * https://<votre-domaine>/api/mobile-money/callback).
 *
 * On ne fait pas confiance au corps reçu : seul le depositId sert, et le statut
 * est relu auprès de l'API pawaPay avec notre jeton.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { depositId?: unknown } | null;
  const depositId = z.string().uuid().safeParse(body?.depositId);

  if (!depositId.success) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    await finalizeMobileMoneyTransaction(depositId.data);
  } catch (error) {
    // 500 : pawaPay renverra le callback plus tard.
    console.error("[mobile-money/callback]", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
