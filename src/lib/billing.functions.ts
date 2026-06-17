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

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Unauthorized: Admin role required");
}

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// ========== COMPANY SETTINGS ==========
export const getCompanySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const admin = adminClient();
    const { data, error } = await admin
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

const CompanySchema = z.object({
  company_name: z.string().min(1).max(200),
  legal_form: z.string().max(100).optional().nullable(),
  siret: z.string().max(50).optional().nullable(),
  vat_number: z.string().max(50).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  iban: z.string().max(50).optional().nullable(),
  bic: z.string().max(20).optional().nullable(),
  vat_rate: z.number().min(0).max(100),
  vat_applicable: z.boolean(),
  legal_mention: z.string().max(500).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
});

export const adminUpdateCompanySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CompanySchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const admin = adminClient();
    const { data: existing } = await admin
      .from("company_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    const payload = { ...data, updated_at: new Date().toISOString() };
    if (existing) {
      const { error } = await admin
        .from("company_settings")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("company_settings").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ========== PROMO CODES ==========
const GenSchema = z.object({
  quantity: z.number().int().min(1).max(500),
  discount_percent: z.number().min(1).max(100),
  length: z.number().int().min(6).max(16).default(8),
});

export const adminGeneratePromoCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GenSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const admin = adminClient();

    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < data.quantity) {
      const c = randomCode(data.length);
      if (seen.has(c)) continue;
      seen.add(c);
      codes.push(c);
    }

    const rows = codes.map((c) => ({
      code: c,
      discount_percent: data.discount_percent,
      created_by: userId,
    }));
    // Insert with retry on conflict (extremely rare)
    const { data: inserted, error } = await admin
      .from("promo_codes")
      .insert(rows)
      .select("code, discount_percent, created_at");
    if (error) throw new Error(error.message);
    return { codes: inserted ?? [] };
  });

export const adminListPromoCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const admin = adminClient();
    const { data, error } = await admin
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const adminDeletePromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const admin = adminClient();
    const { error } = await admin.from("promo_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: validate a code (does NOT mark as used — used at reservation creation)
export const validatePromoCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ code: z.string().min(3).max(32) }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = adminClient();
    const code = data.code.trim().toUpperCase();
    const { data: row, error } = await admin
      .from("promo_codes")
      .select("code, discount_percent, used")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { valid: false, reason: "Code introuvable" };
    if (row.used) return { valid: false, reason: "Code déjà utilisé" };
    return {
      valid: true,
      code: row.code,
      discount_percent: Number(row.discount_percent),
    };
  });

// ========== INVOICE ==========
export const getInvoiceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const admin = adminClient();

    const { data: resv, error } = await admin
      .from("reservations")
      .select("*")
      .eq("id", data.reservation_id)
      .single();
    if (error) throw new Error(error.message);

    // Driver via availability
    const { data: av } = await admin
      .from("driver_availabilities")
      .select("driver_id")
      .eq("reservation_id", data.reservation_id)
      .maybeSingle();
    let driver: any = null;
    if (av?.driver_id) {
      const { data: d } = await admin
        .from("drivers")
        .select("full_name, phone, email, vehicle_model, vehicle_plate, license_number, user_id")
        .eq("id", av.driver_id)
        .maybeSingle();
      driver = d;
    }

    // Authorization: admin OR customer (email match) OR assigned driver (user_id match)
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    const callerEmail = ((claims as any)?.email ?? "").toLowerCase();
    const isCustomer =
      !!callerEmail && callerEmail === (resv.customer_email ?? "").toLowerCase();
    const isAssignedDriver = !!driver?.user_id && driver.user_id === userId;

    if (!isAdmin && !isCustomer && !isAssignedDriver) {
      throw new Error("Unauthorized");
    }

    const { data: company } = await admin
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Strip sensitive fields for non-admin callers
    let driverOut = driver;
    let companyOut: any = company;
    if (driver) {
      const { user_id: _u, ...rest } = driver;
      driverOut = isAdmin
        ? rest
        : { ...rest, license_number: null, email: null };
    }
    if (company && !isAdmin) {
      companyOut = { ...company, iban: null, bic: null };
    }

    return { reservation: resv, driver: driverOut, company: companyOut };
  });
