"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { setUserRole, type SetUserRoleState } from "@/actions/admin-users";
import type { UserRole } from "@/lib/supabase/types";

const initialState: SetUserRoleState = { ok: false, message: "" };

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "driver", label: "Chauffeur" },
  { value: "investor", label: "Investisseur" },
  { value: "admin", label: "Administrateur" }
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary min-h-10 px-3" disabled={pending}>
      {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      Appliquer
    </button>
  );
}

type Props = {
  userId: string;
  currentRole: UserRole;
  userName: string;
};

export function UserRoleForm({ userId, currentRole, userName }: Props) {
  const [state, formAction] = useFormState(setUserRole, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col items-start gap-2 md:items-end"
      onSubmit={(event) => {
        const role = new FormData(event.currentTarget).get("role");
        if (role === currentRole) {
          event.preventDefault();
          return;
        }
        const label = roleOptions.find((option) => option.value === role)?.label.toLowerCase();
        if (!window.confirm(`Passer ${userName} en ${label} ?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Rôle de {userName}
        </label>
        <select id={`role-${userId}`} name="role" defaultValue={currentRole} className="field min-h-10 py-1.5 text-sm">
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <SubmitButton />
      </div>
      {state.message ? (
        <p role="status" className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
