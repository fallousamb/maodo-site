import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionStatus } from "@/lib/payments.functions";
import { z } from "zod";

const searchSchema = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/paiement-confirme")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentConfirmedPage,
  head: () => ({ meta: [{ title: "Paiement confirmé — VTC Royal Prestige" }] }),
});

function PaymentConfirmedPage() {
  const { session_id } = useSearch({ from: "/paiement-confirme" });
  const check = useServerFn(getSessionStatus);
  const q = useQuery({
    queryKey: ["session", session_id],
    queryFn: () => check({ data: { session_id: session_id! } }),
    enabled: !!session_id,
    retry: 2,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg rounded-2xl bg-card p-10 text-center shadow-card">
        {!session_id || q.isLoading ? (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Vérification du paiement…</p>
          </>
        ) : q.data?.paid ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-4 text-2xl font-semibold">Paiement confirmé !</h1>
            <p className="mt-2 text-muted-foreground">
              Merci, votre course de {q.data.amount.toFixed(2)} € est réservée. Nous vous
              contactons rapidement pour confirmer les détails.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold">Paiement en attente</h1>
            <p className="mt-2 text-muted-foreground">
              Le paiement n'a pas encore été confirmé. Si vous avez bien payé, votre réservation
              sera validée automatiquement dans quelques instants.
            </p>
          </>
        )}
        <Link to="/">
          <Button className="mt-6">Retour à l'accueil</Button>
        </Link>
      </div>
    </div>
  );
}
