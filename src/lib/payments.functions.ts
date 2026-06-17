import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe/v1";

function getKeys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const stripeKey = process.env.STRIPE_SANDBOX_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY manquant");
  if (!stripeKey) throw new Error("STRIPE_SANDBOX_API_KEY manquant");
  return { lovableKey, stripeKey };
}

function form(obj: Record<string, string>) {
  return new URLSearchParams(obj).toString();
}

const schema = z.object({
  reservation_id: z.string().uuid(),
  origin: z.string().url().max(300),
});

const MIN_PRICE_EUR = 15;
const MAX_PRICE_EUR = 10000;

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { lovableKey, stripeKey } = getKeys();

    const supaUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !serviceKey) throw new Error("Backend non configuré");
    const admin = createClient(supaUrl, serviceKey);

    // Load reservation server-side — never trust client-supplied amount
    const { data: reservation, error: rErr } = await admin
      .from("reservations")
      .select("id, estimated_price, customer_email, pickup_address, dropoff_address, payment_status")
      .eq("id", data.reservation_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!reservation) throw new Error("Réservation introuvable");
    if (reservation.payment_status === "paid") throw new Error("Réservation déjà payée");

    const priceNum = Number(reservation.estimated_price);
    if (!Number.isFinite(priceNum) || priceNum < MIN_PRICE_EUR || priceNum > MAX_PRICE_EUR) {
      throw new Error("Montant de la course invalide");
    }
    const amountCents = Math.round(priceNum * 100);

    const body: Record<string, string> = {
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][price_data][product_data][name]": `Course VTC Royal Prestige`,
      "line_items[0][price_data][product_data][description]":
        `${reservation.pickup_address} → ${reservation.dropoff_address}`.slice(0, 250),
      customer_email: reservation.customer_email,
      success_url: `${data.origin}/paiement-confirme?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/?paiement=annule`,
      "metadata[reservation_id]": data.reservation_id,
    };

    const res = await fetch(`${GATEWAY_URL}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": stripeKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form(body),
    });

    const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url || !json.id) {
      throw new Error(json.error?.message ?? `Stripe error [${res.status}]`);
    }

    await admin
      .from("reservations")
      .update({ stripe_session_id: json.id, payment_method: "card" })
      .eq("id", data.reservation_id);

    return { url: json.url, sessionId: json.id };
  });

export const getSessionStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ session_id: z.string().min(5).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { lovableKey, stripeKey } = getKeys();
    const res = await fetch(`${GATEWAY_URL}/checkout/sessions/${data.session_id}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": stripeKey,
      },
    });
    const json = (await res.json()) as {
      payment_status?: string;
      amount_total?: number;
      customer_email?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message ?? `Stripe error [${res.status}]`);
    return {
      paid: json.payment_status === "paid",
      amount: (json.amount_total ?? 0) / 100,
      email: json.customer_email ?? null,
    };
  });
