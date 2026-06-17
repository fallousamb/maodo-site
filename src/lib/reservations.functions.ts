import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const countReservationsByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email().max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré.");
    const admin = createClient(url, serviceKey);
    const { count, error } = await admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("customer_email", data.email.toLowerCase().trim());
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

const schema = z.object({
  customer_name: z.string().min(2).max(120),
  customer_phone: z.string().min(6).max(30),
  customer_email: z.string().email().max(200),
  pickup_address: z.string().min(3).max(300),
  dropoff_address: z.string().min(3).max(300),
  pickup_datetime: z.string().min(8),
  distance_km: z.number().nonnegative().optional(),
  duration_min: z.number().nonnegative().optional(),
  estimated_price: z.number().nonnegative().optional(),
  message: z.string().max(1000).optional().nullable(),
  availability_id: z.string().uuid().optional().nullable(),
  promo_code: z.string().min(3).max(32).optional().nullable(),
});

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    schema.extend({ payment_method: z.enum(["card", "cash"]).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré.");
    const admin = createClient(url, serviceKey);

    let pickupIso = data.pickup_datetime;

    if (data.availability_id) {
      const { data: slot, error: sErr } = await admin
        .from("driver_availabilities")
        .select("id, start_at, reservation_id")
        .eq("id", data.availability_id)
        .maybeSingle();
      if (sErr) throw new Error(sErr.message);
      if (!slot) throw new Error("Créneau introuvable");
      if (slot.reservation_id) throw new Error("Ce créneau vient d'être réservé");
      pickupIso = slot.start_at as string;
    }

    // Validate + reserve promo code (single-use) BEFORE creating reservation
    let promoCode: string | null = null;
    if (data.promo_code) {
      const code = data.promo_code.trim().toUpperCase();
      const { data: promoRow, error: pErr } = await admin
        .from("promo_codes")
        .select("id, code, used")
        .eq("code", code)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!promoRow) throw new Error("Code promo invalide");
      if (promoRow.used) throw new Error("Code promo déjà utilisé");
      promoCode = promoRow.code as string;
    }

    const { data: row, error } = await admin
      .from("reservations")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        pickup_address: data.pickup_address,
        dropoff_address: data.dropoff_address,
        pickup_datetime: pickupIso,
        distance_km: data.distance_km ?? null,
        duration_min: data.duration_min ?? null,
        estimated_price: data.estimated_price ?? null,
        message: data.message ?? null,
        payment_method: data.payment_method ?? "cash",
        promo_code: promoCode,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    const reservationId = row.id as string;

    // Atomically mark promo as used (only if still free)
    if (promoCode) {
      const { data: claimed, error: pcErr } = await admin
        .from("promo_codes")
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by_reservation_id: reservationId,
        })
        .eq("code", promoCode)
        .eq("used", false)
        .select("id");
      if (pcErr || !claimed || claimed.length === 0) {
        await admin.from("reservations").delete().eq("id", reservationId);
        throw new Error("Code promo déjà utilisé entre-temps");
      }
    }

    if (data.availability_id) {
      const { data: claimed, error: cErr } = await admin
        .from("driver_availabilities")
        .update({ reservation_id: reservationId })
        .eq("id", data.availability_id)
        .is("reservation_id", null)
        .select("id");
      if (cErr) throw new Error(cErr.message);
      if (!claimed || claimed.length === 0) {
        await admin.from("reservations").delete().eq("id", reservationId);
        throw new Error("Ce créneau vient d'être réservé par un autre client");
      }
    }

    return { ok: true, id: reservationId };
  });

