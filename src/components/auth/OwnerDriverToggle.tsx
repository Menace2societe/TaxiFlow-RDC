"use client";

import { useEffect, useState } from "react";
import { choiceClass } from "@/components/auth/choice";

/**
 * Choix « chauffeur-patron », affiché uniquement quand le rôle chauffeur
 * est sélectionné dans le formulaire parent.
 * Écoute les changements du groupe radio[name="role"] du formulaire parent.
 * Envoie is_owner_driver = "on" pour le chauffeur-patron (comme l'ancienne case à cocher), "off" sinon.
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
    <fieldset>
      <legend className="mb-1.5 text-[15px] font-semibold">À qui est le véhicule ?</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="cursor-pointer">
          <input type="radio" name="is_owner_driver" value="off" defaultChecked className="peer sr-only" />
          <span className={choiceClass}>
            <span className="text-[17px] font-bold">À un investisseur</span>
            <span className="text-[15px] font-medium">Je le conduis</span>
          </span>
        </label>
        <label className="cursor-pointer">
          <input id="is_owner_driver" type="radio" name="is_owner_driver" value="on" className="peer sr-only" />
          <span className={choiceClass}>
            <span className="text-[17px] font-bold">À moi</span>
            <span className="text-[15px] font-medium">Chauffeur-patron</span>
          </span>
        </label>
      </div>
      <p className="mt-2 text-[15px]">
        Chauffeur-patron : vous possédez votre véhicule et gérez vous-même vos documents légaux (carte rose, assurance,
        permis), dans un espace personnel, sans dépendre d&apos;un investisseur.
      </p>
    </fieldset>
  );
}
