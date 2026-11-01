import Link from "next/link";
import { SmsLoginForm } from "@/components/auth/SmsLoginForm";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Connexion par SMS — TaxiFlow RDC" };

export default function SmsLoginPage() {
  return (
    <div className="w-full">
      <h1 className="font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Connexion par code</h1>
      <p className="mt-3 text-[17px]">Recevez un code à usage unique sur votre téléphone. Aucun mot de passe à retenir.</p>
      <div className="mt-6">
        <SmsLoginForm />
      </div>
      <p className="mt-8 border-t-2 border-plate-rule pt-6 text-center text-[16px]">
        <Link className="font-bold underline underline-offset-4" href={ROUTES.LOGIN}>
          Se connecter avec email ou code d&apos;accès
        </Link>
      </p>
    </div>
  );
}
