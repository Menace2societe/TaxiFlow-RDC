import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { SmsLoginForm } from "@/components/auth/SmsLoginForm";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Connexion par SMS — TaxiFlow RDC" };

export default function SmsLoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700">
          <MessageSquareText className="text-white" size={20} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Connexion par code</h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
          Recevez un code à usage unique sur votre téléphone. Aucun mot de passe à retenir.
        </p>
      </div>
      <SmsLoginForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        <Link className="underline" href={ROUTES.LOGIN}>
          Se connecter avec email ou code d&apos;accès
        </Link>
      </p>
    </div>
  );
}
