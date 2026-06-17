import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Backend non configuré");
  return createClient(url, key);
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function ensureDriverOwnsReservation(
  supabase: any,
  userId: string,
  reservationId: string,
) {
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!driver) throw new Error("Profil chauffeur introuvable");
  const { data: own } = await supabase
    .from("driver_availabilities")
    .select("id")
    .eq("driver_id", driver.id)
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (!own) throw new Error("Cette réservation ne vous est pas assignée");
  return driver.id as string;
}

// Driver-side: reject an assigned reservation (frees the slot for admin reassignment)
export const rejectAssignedReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureDriverOwnsReservation(supabase, userId, data.reservation_id);
    const admin = adminClient();
    const { error: freeErr } = await admin
      .from("driver_availabilities")
      .update({ reservation_id: null })
      .eq("reservation_id", data.reservation_id);
    if (freeErr) throw new Error(freeErr.message);
    const { error: rErr } = await admin
      .from("reservations")
      .update({ status: "pending" })
      .eq("id", data.reservation_id);
    if (rErr) throw new Error(rErr.message);
    return { ok: true };
  });

// Driver-side: start the course → generates tracking token, sets in_progress + started_at
export const startCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureDriverOwnsReservation(supabase, userId, data.reservation_id);
    const admin = adminClient();
    const { data: existing } = await admin
      .from("reservations")
      .select("tracking_token, status")
      .eq("id", data.reservation_id)
      .single();

    const token = existing?.tracking_token ?? randomToken();
    const { error } = await admin
      .from("reservations")
      .update({
        tracking_token: token,
        status: "in_progress",
        started_at: existing?.status === "in_progress" ? undefined : new Date().toISOString(),
      })
      .eq("id", data.reservation_id);
    if (error) throw new Error(error.message);
    return { ok: true, tracking_token: token };
  });

// Driver-side: push current GPS position
const PosSchema = z.object({
  reservation_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional().nullable(),
  speed: z.number().min(0).max(500).optional().nullable(),
});

export const pushDriverPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PosSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("course_tracking").insert({
      reservation_id: data.reservation_id,
      actor: "driver",
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? null,
      speed: data.speed ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: get tracking data via token (no auth needed)
export const getPublicTracking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(20).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = adminClient();
    const { data: resv, error } = await admin
      .from("reservations")
      .select(
        "id, customer_name, pickup_address, dropoff_address, pickup_datetime, status, started_at, completed_at",
      )
      .eq("tracking_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resv) throw new Error("Lien de suivi invalide");

    // Driver public info
    const { data: av } = await admin
      .from("driver_availabilities")
      .select("driver_id")
      .eq("reservation_id", resv.id)
      .maybeSingle();
    let driver: { full_name: string; phone: string; vehicle: string | null } | null = null;
    if (av?.driver_id) {
      const { data: d } = await admin
        .from("drivers")
        .select("full_name, phone, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate")
        .eq("id", av.driver_id)
        .maybeSingle();
      if (d) {
        const vehicleParts = [d.vehicle_brand, d.vehicle_model, d.vehicle_color]
          .filter(Boolean)
          .join(" ");
        driver = {
          full_name: d.full_name as string,
          phone: d.phone as string,
          vehicle: vehicleParts ? `${vehicleParts}${d.vehicle_plate ? ` (${d.vehicle_plate})` : ""}` : null,
        };
      }
    }

    const { data: last } = await admin
      .from("course_tracking")
      .select("lat, lng, heading, speed, recorded_at")
      .eq("reservation_id", resv.id)
      .eq("actor", "driver")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      reservation: {
        customer_name: resv.customer_name,
        pickup_address: resv.pickup_address,
        dropoff_address: resv.dropoff_address,
        pickup_datetime: resv.pickup_datetime,
        status: resv.status,
        started_at: resv.started_at,
        completed_at: resv.completed_at,
      },
      driver,
      position: last
        ? {
            lat: Number(last.lat),
            lng: Number(last.lng),
            heading: last.heading != null ? Number(last.heading) : null,
            speed: last.speed != null ? Number(last.speed) : null,
            recorded_at: last.recorded_at as string,
          }
        : null,
    };
  });

// Driver-side: get tracking token + public URL
export const getMyTrackingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureDriverOwnsReservation(supabase, userId, data.reservation_id);
    const admin = adminClient();
    const { data: r } = await admin
      .from("reservations")
      .select("tracking_token, status")
      .eq("id", data.reservation_id)
      .single();
    return { tracking_token: r?.tracking_token ?? null, status: r?.status ?? null };
  });
