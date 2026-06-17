import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Backend non configuré");
  return createClient(url, key);
}

export const listMyClientReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) {
      return { email: null, reservations: [] as any[] };
    }
    const admin = adminClient();
    const { data, error } = await admin
      .from("reservations")
      .select(
        "id, customer_name, customer_phone, customer_email, pickup_address, dropoff_address, pickup_datetime, distance_km, duration_min, estimated_price, status, payment_status, payment_method, promo_code, invoice_number, invoice_issued_at, completed_at, created_at",
      )
      .eq("customer_email", email.toLowerCase().trim())
      .order("pickup_datetime", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { email, reservations: data ?? [] };
  });
