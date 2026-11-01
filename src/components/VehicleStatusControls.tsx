import { updateVehicleStatus, type VehicleOperationalStatus } from "@/actions/vehicles";
import { vehicleStatusLabels } from "@/components/driver/plate";
import type { VehicleStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

const statusActions: Array<{ value: VehicleOperationalStatus; db: VehicleStatus; description: string }> = [
  { value: "en service", db: "en service", description: "Véhicule disponible" },
  { value: "maintenance", db: "maintenance", description: "Véhicule en réparation" },
  { value: "repos", db: "repos", description: "Véhicule hors service" }
];

/** Les trois boutons d'état, comme sur l'écran Aujourd'hui du chauffeur : l'état actuel est rempli d'encre. */
export function VehicleStatusControls({
  vehicleId,
  currentStatus,
  compact = false
}: {
  vehicleId: string;
  currentStatus: VehicleStatus;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {statusActions.map((action) => {
        const active = currentStatus === action.db;
        return (
          <form key={action.value} action={updateVehicleStatus.bind(null, vehicleId, action.value)}>
            <button
              type="submit"
              aria-pressed={active}
              title={action.description}
              className={cn(
                "min-h-[52px] w-full rounded-xl border-2 border-plate-ink px-1 font-bold leading-tight transition-colors",
                compact ? "text-[15px]" : "text-base",
                active ? "bg-plate-ink text-plate-white" : "bg-plate-white text-plate-ink hover:bg-plate-ground"
              )}
            >
              {vehicleStatusLabels[action.db]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
