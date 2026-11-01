import { AlertTriangle, CheckCircle2 } from "lucide-react";

/** Message sous le titre des pages d'accès : bordure de 2px à la couleur de l'état, icône de 18px. */
export function AuthNotice({ tone, children, className = "" }: { tone: "ok" | "bad"; children: React.ReactNode; className?: string }) {
  const ok = tone === "ok";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
        ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
      } ${className}`}
    >
      {ok ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
      )}
      <span>{children}</span>
    </p>
  );
}
