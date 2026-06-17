import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  // Stripe-Signature: t=timestamp,v1=signature
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const signed = `${t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
        const supaUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!secret || !supaUrl || !serviceKey) {
          return new Response("Backend not configured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!signature || !verifyStripeSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as {
          type: string;
          data: { object: any };
        };

        const admin = createClient(supaUrl, serviceKey);

        if (
          event.type === "checkout.session.completed" ||
          event.type === "transaction.completed"
        ) {
          const obj = event.data.object;
          const reservationId = obj?.metadata?.reservation_id;
          const sessionId = obj?.id;
          if (reservationId) {
            await admin
              .from("reservations")
              .update({ payment_status: "paid", status: "confirmed" })
              .eq("id", reservationId);
          } else if (sessionId) {
            await admin
              .from("reservations")
              .update({ payment_status: "paid", status: "confirmed" })
              .eq("stripe_session_id", sessionId);
          }
        } else if (event.type === "transaction.payment_failed") {
          const obj = event.data.object;
          const reservationId = obj?.metadata?.reservation_id;
          if (reservationId) {
            await admin
              .from("reservations")
              .update({ payment_status: "failed" })
              .eq("id", reservationId);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
