"use client";

import { useEffect, useState } from "react";
import { Crown, Info } from "lucide-react";

/**
 * Affiche un toggle "Chauffeur-Patron" uniquement quand le rôle driver
 * est sélectionné dans le formulaire parent.
 * Écoute les changements du groupe radio[name="role"] du form parent.
 */
export function OwnerDriverToggle() {
  const [isDriverRole, setIsDriverRole] = useState(true); // Défaut = chauffeur

  useEffect(() => {
    function syncRole() {
      const checked = document.querySelector<HTMLInputElement>(
        'input[name="role"]:checked'
      );
      setIsDriverRole(!checked || checked.value === "driver");
    }

    syncRole();

    // Écouter les changements de rôle sur tout le document
    const handler = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === "radio" && target.name === "role") {
        syncRole();
      }
    };

    document.addEventListener("change", handler);
    return () => document.removeEventListener("change", handler);
  }, []);

  if (!isDriverRole) return null;

  return (
    <div className="mt-1 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <label
        htmlFor="is_owner_driver"
        className="flex cursor-pointer items-start gap-3"
      >
        {/* Checkbox cachée stylisée */}
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            id="is_owner_driver"
            type="checkbox"
            name="is_owner_driver"
            value="on"
            className="peer sr-only"
          />
          {/* Boîte visuelle */}
          <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-neutral-600 bg-neutral-900 transition-all peer-checked:border-amber-500 peer-checked:bg-amber-500">
            <svg
              className="hidden h-3 w-3 text-white peer-checked:block"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Texte */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-amber-400" aria-hidden />
            <span className="text-sm font-semibold text-amber-100">
              Je suis un Chauffeur-Patron
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-300/70">
            Je possède mon propre véhicule et je gère mes documents légaux (Carte Rose, Assurance, Permis) de façon autonome.
          </p>
        </div>
      </label>

      {/* Info box */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
        <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[11px] text-amber-300/80">
          En cochant cette option, vous accédez à un espace personnel de gestion de documents sans dépendre d&apos;un investisseur tiers.
        </p>
      </div>
    </div>
  );
}
