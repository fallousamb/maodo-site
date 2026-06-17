import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data, userId };
  });

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .order("pickup_datetime", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ids = (reservations ?? []).map((r: any) => r.id as string);
    const driverByReservation: Record<string, { id: string; name: string }> = {};
    if (ids.length) {
      const { data: avs } = await supabase
        .from("driver_availabilities")
        .select("reservation_id, driver_id")
        .in("reservation_id", ids);
      const driverIds = Array.from(
        new Set((avs ?? []).map((a: any) => a.driver_id as string)),
      );
      if (driverIds.length) {
        const { data: drs } = await supabase
          .from("drivers")
          .select("id, full_name")
          .in("id", driverIds);
        const nameById = new Map(
          (drs ?? []).map((d: any) => [d.id as string, d.full_name as string]),
        );
        for (const a of avs ?? []) {
          if (a.reservation_id) {
            driverByReservation[a.reservation_id as string] = {
              id: a.driver_id as string,
              name: nameById.get(a.driver_id as string) ?? "—",
            };
          }
        }
      }
    }

    return {
      reservations: (reservations ?? []).map((r: any) => ({
        ...r,
        driver: driverByReservation[r.id] ?? null,
      })),
    };
  });

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StatusSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Unauthorized: Admin role required");
    const { error } = await supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("reservations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
