"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VehicleStatus } from "@/lib/supabase/types";

const nextStatus: Record<VehicleStatus, VehicleStatus> = {
  active: "inactive",
  inactive: "active",
  maintenance: "active"
};

export async function toggleVehicleStatus(formData: FormData) {
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "inactive") as VehicleStatus;

  if (!vehicleId) {
    redirect("/dashboard/fleet?error=Vehicule introuvable");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/fleet");
  }

  const { error } = await (supabase.from("vehicles") as any)
    .update({ 
      status: nextStatus[currentStatus] ?? "active" 
    })
    .eq("id", vehicleId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard/fleet?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/fleet");
  revalidatePath("/dashboard/overview");
  redirect("/dashboard/fleet?updated=1");
}
