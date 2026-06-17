import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAvailableSlots = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);

    const nowIso = new Date().toISOString();
    const { data: slots, error } = await admin
      .from("driver_availabilities")
      .select("id, start_at, end_at, driver_id")
      .is("reservation_id", null)
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!slots || slots.length === 0) return { slots: [] };

    const driverIds = Array.from(new Set(slots.map((s) => s.driver_id)));
    const { data: drivers, error: dErr } = await admin
      .from("drivers")
      .select("id, full_name, status")
      .in("id", driverIds)
      .eq("status", "approved");
    if (dErr) throw new Error(dErr.message);

    const approved = new Map((drivers ?? []).map((d) => [d.id, d.full_name as string]));
    return {
      slots: slots
        .filter((s) => approved.has(s.driver_id))
        .map((s) => ({
          id: s.id as string,
          start_at: s.start_at as string,
          end_at: s.end_at as string,
          driver_first_name: (approved.get(s.driver_id) ?? "").split(" ")[0] || "Chauffeur",
        })),
    };
  });


const RegisterSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  email: z.string().email().max(200),
  vehicle_model: z.string().max(120).optional().nullable(),
  vehicle_plate: z.string().max(20).optional().nullable(),
  license_number: z.string().max(60).optional().nullable(),
});

export const registerDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RegisterSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("drivers")
      .upsert(
        { ...data, user_id: userId, status: "pending" },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { driver: row };
  });

export const getMyDriver = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { driver: data };
  });

export const listMyAvailabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) return { availabilities: [] };
    const { data, error } = await supabase
      .from("driver_availabilities")
      .select("*")
      .eq("driver_id", driver.id)
      .order("start_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { availabilities: data ?? [] };
  });

const AddSlotSchema = z
  .object({
    start_at: z.string().min(8),
    end_at: z.string().min(8),
  })
  .refine(
    (v) => {
      const s = new Date(v.start_at).getTime();
      const e = new Date(v.end_at).getTime();
      return Number.isFinite(s) && Number.isFinite(e) && e > s;
    },
    { message: "L'heure de fin doit être strictement après l'heure de début." },
  );

export const addAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AddSlotSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: driver, error: dErr } = await supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!driver) throw new Error("Profil chauffeur introuvable");
    if (driver.status !== "approved")
      throw new Error("Profil non validé par l'administrateur");

    const startIso = new Date(data.start_at).toISOString();
    const endIso = new Date(data.end_at).toISOString();

    // Application-level overlap check (defense-in-depth + nicer error)
    const { data: overlapping, error: oErr } = await supabase
      .from("driver_availabilities")
      .select("id")
      .eq("driver_id", driver.id)
      .lt("start_at", endIso)
      .gt("end_at", startIso)
      .limit(1);
    if (oErr) throw new Error(oErr.message);
    if (overlapping && overlapping.length > 0) {
      throw new Error("Ce créneau chevauche un créneau existant.");
    }

    const { data: row, error } = await supabase
      .from("driver_availabilities")
      .insert({ driver_id: driver.id, start_at: startIso, end_at: endIso })
      .select()
      .single();
    if (error) {
      if (error.message.includes("driver_availabilities_no_overlap")) {
        throw new Error("Ce créneau chevauche un créneau existant.");
      }
      if (error.message.includes("driver_availabilities_valid_range")) {
        throw new Error("L'heure de fin doit être strictement après l'heure de début.");
      }
      throw new Error(error.message);
    }
    return { availability: row };
  });

export const listMyAssignedReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) return { reservations: [] };

    const { data: avs, error: aErr } = await supabase
      .from("driver_availabilities")
      .select("id, reservation_id, start_at")
      .eq("driver_id", driver.id)
      .not("reservation_id", "is", null);
    if (aErr) throw new Error(aErr.message);
    const ids = (avs ?? []).map((a) => a.reservation_id as string);
    if (ids.length === 0) return { reservations: [] };

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);
    const { data: resvs, error: rErr } = await admin
      .from("reservations")
      .select(
        "id, customer_name, customer_phone, customer_email, pickup_address, dropoff_address, pickup_datetime, status, estimated_price, completed_at, invoice_number, invoice_issued_at",
      )
      .in("id", ids)
      .order("pickup_datetime", { ascending: true });
    if (rErr) throw new Error(rErr.message);
    return { reservations: resvs ?? [] };
  });

export const completeReservationByDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) throw new Error("Profil chauffeur introuvable");

    const { data: own, error: oErr } = await supabase
      .from("driver_availabilities")
      .select("id")
      .eq("driver_id", driver.id)
      .eq("reservation_id", data.reservation_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!own) throw new Error("Cette réservation ne vous est pas assignée");

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);

    const { data: existing } = await admin
      .from("reservations")
      .select("invoice_number")
      .eq("id", data.reservation_id)
      .single();
    if (existing?.invoice_number) {
      return { ok: true, invoice_number: existing.invoice_number };
    }

    // Compute next invoice number (year-scoped, padded). Best-effort sans race.
    const year = new Date().getFullYear();
    const { data: q, error: qErr } = await admin
      .from("reservations")
      .select("invoice_number")
      .like("invoice_number", `F-${year}-%`);
    if (qErr) throw new Error(qErr.message);
    const used = (q ?? [])
      .map((r) => Number((r.invoice_number as string)?.split("-").pop()))
      .filter((n) => Number.isFinite(n));
    const nextNum = (used.length ? Math.max(...used) : 0) + 1;
    const invoiceNumber = `F-${year}-${String(nextNum).padStart(5, "0")}`;

    const nowIso = new Date().toISOString();
    const { error: uErr } = await admin
      .from("reservations")
      .update({
        status: "completed",
        completed_at: nowIso,
        invoice_number: invoiceNumber,
        invoice_issued_at: nowIso,
      })
      .eq("id", data.reservation_id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, invoice_number: invoiceNumber };
  });

export const confirmReservationByDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Verify the driver owns an availability linked to this reservation
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, full_name, phone")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) throw new Error("Profil chauffeur introuvable");

    const { data: own, error: oErr } = await supabase
      .from("driver_availabilities")
      .select("id")
      .eq("driver_id", driver.id)
      .eq("reservation_id", data.reservation_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!own) throw new Error("Cette réservation ne vous est pas assignée");

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);

    const { data: resv, error: rErr } = await admin
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", data.reservation_id)
      .select(
        "id, customer_name, customer_email, customer_phone, pickup_address, dropoff_address, pickup_datetime, estimated_price",
      )
      .single();
    if (rErr) throw new Error(rErr.message);

    // Send email confirmation (best-effort; will be wired to Lovable Emails once domain is configured)
    try {
      const { sendTransactionalEmail } = await import("@/lib/email/send.server");
      await sendTransactionalEmail({
        templateName: "reservation-confirmed",
        recipientEmail: resv.customer_email as string,
        idempotencyKey: `reservation-confirmed-${resv.id}`,
        templateData: {
          customerName: resv.customer_name,
          driverName: driver.full_name,
          driverPhone: driver.phone,
          pickupAddress: resv.pickup_address,
          dropoffAddress: resv.dropoff_address,
          pickupDateTime: resv.pickup_datetime,
          estimatedPrice: resv.estimated_price,
        },
      });
    } catch (e) {
      console.error("[confirmReservation] email send failed:", e);
    }

    return { ok: true };
  });

export const deleteAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("driver_availabilities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ADMIN
export const adminListDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { drivers: data ?? [] };
  });

const AdminUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
});

export const adminUpdateDriverStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AdminUpdateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: role, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!role) throw new Error("Unauthorized: Admin role required");
    const { error } = await supabase
      .from("drivers")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReassignSchema = z.object({
  reservation_id: z.string().uuid(),
  driver_id: z.string().uuid().nullable(),
});

export const adminReassignReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReassignSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Verify admin
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Unauthorized: Admin role required");

    // Service-role client to bypass RLS on driver_availabilities (no UPDATE policy)
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);

    // Load reservation
    const { data: resv, error: rErr } = await admin
      .from("reservations")
      .select("id, pickup_datetime, duration_min")
      .eq("id", data.reservation_id)
      .single();
    if (rErr) throw new Error(rErr.message);

    // Free any current availability holding this reservation
    const { error: freeErr } = await admin
      .from("driver_availabilities")
      .update({ reservation_id: null })
      .eq("reservation_id", data.reservation_id);
    if (freeErr) throw new Error(freeErr.message);

    if (!data.driver_id) return { ok: true, detached: true };

    // Verify target driver is approved
    const { data: drv, error: drvErr } = await admin
      .from("drivers")
      .select("id, status")
      .eq("id", data.driver_id)
      .maybeSingle();
    if (drvErr) throw new Error(drvErr.message);
    if (!drv) throw new Error("Chauffeur introuvable");
    if (drv.status !== "approved")
      throw new Error("Ce chauffeur n'est pas validé");

    const startIso = new Date(resv.pickup_datetime as string).toISOString();
    const durMin = Number(resv.duration_min ?? 60) || 60;
    const endIso = new Date(
      new Date(resv.pickup_datetime as string).getTime() + durMin * 60_000,
    ).toISOString();

    // Reuse an existing free slot of the target driver that contains pickup
    const { data: existing, error: exErr } = await admin
      .from("driver_availabilities")
      .select("id")
      .eq("driver_id", data.driver_id)
      .is("reservation_id", null)
      .lte("start_at", startIso)
      .gte("end_at", startIso)
      .limit(1);
    if (exErr) throw new Error(exErr.message);

    if (existing && existing.length > 0) {
      const { error: upErr } = await admin
        .from("driver_availabilities")
        .update({ reservation_id: data.reservation_id })
        .eq("id", existing[0].id);
      if (upErr) throw new Error(upErr.message);
      return { ok: true, reused: true };
    }

    // Otherwise create a dedicated slot for this reservation
    const { error: insErr } = await admin
      .from("driver_availabilities")
      .insert({
        driver_id: data.driver_id,
        start_at: startIso,
        end_at: endIso,
        reservation_id: data.reservation_id,
      });
    if (insErr) {
      if (insErr.message.includes("driver_availabilities_no_overlap")) {
        throw new Error(
          "Ce chauffeur a déjà un créneau qui chevauche cette course.",
        );
      }
      throw new Error(insErr.message);
    }
    return { ok: true, created: true };
  });

const AdminCreateSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  email: z.string().email().max(200),
  vehicle_model: z.string().max(120).optional().nullable(),
  vehicle_plate: z.string().max(20).optional().nullable(),
  license_number: z.string().max(60).optional().nullable(),
  status: z
    .enum(["pending", "approved", "rejected", "suspended"])
    .default("approved"),
});

export const adminCreateDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AdminCreateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Unauthorized: Admin role required");

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(url, serviceKey);

    const { data: row, error } = await admin
      .from("drivers")
      .insert({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        vehicle_model: data.vehicle_model ?? null,
        vehicle_plate: data.vehicle_plate ?? null,
        license_number: data.license_number ?? null,
        status: data.status,
        user_id: null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { driver: row };
  });

