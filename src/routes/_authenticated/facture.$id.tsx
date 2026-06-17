import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getInvoiceData } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/facture/$id")({
  component: InvoicePage,
  head: () => ({ meta: [{ title: "Facture — VTC Royal Prestige" }] }),
});

function InvoicePage() {
  const { id } = Route.useParams();
  const get = useServerFn(getInvoiceData);
  const q = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => get({ data: { reservation_id: id } }),
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-destructive">
        Impossible de charger la facture.
      </div>
    );
  }

  const { reservation: r, driver, company } = q.data as any;
  const isInvoice = !!r.invoice_number;
  const pickup = new Date(r.pickup_datetime);
  const durationMin = r.duration_min != null ? Number(r.duration_min) : null;
  const arrival = durationMin != null
    ? new Date(pickup.getTime() + durationMin * 60_000)
    : null;
  const issued = r.invoice_issued_at ? new Date(r.invoice_issued_at) : null;
  const created = new Date(r.created_at);

  const total = Number(r.estimated_price ?? 0);
  const vatRate = Number(company?.vat_rate ?? 10);
  const vatApplicable = !!company?.vat_applicable;
  const ht = vatApplicable ? total / (1 + vatRate / 100) : total;
  const tva = vatApplicable ? total - ht : 0;

  return (
    <div className="min-h-screen bg-muted/30 py-6">
      <div className="mx-auto max-w-3xl px-4 print:px-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link to="/espace-chauffeur" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>

        <div className="rounded-2xl bg-white p-10 shadow-soft text-sm text-zinc-900 print:shadow-none print:rounded-none">
          <div className="flex items-start justify-between">
            <div>
              {company?.logo_url && (
                <img src={company.logo_url} alt="" className="mb-3 h-12" />
              )}
              <h1 className="text-xl font-bold">{company?.company_name || "—"}</h1>
              {company?.legal_form && <div>{company.legal_form}</div>}
              {company?.address && <div>{company.address}</div>}
              <div>
                {[company?.postal_code, company?.city].filter(Boolean).join(" ")}
                {company?.country ? ` · ${company.country}` : ""}
              </div>
              {company?.phone && <div>Tél : {company.phone}</div>}
              {company?.email && <div>{company.email}</div>}
              {company?.siret && <div className="mt-1">SIRET : {company.siret}</div>}
              {company?.vat_number && <div>TVA : {company.vat_number}</div>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">
                {isInvoice ? "FACTURE" : "BON DE COMMANDE"}
              </div>
              <div className="mt-2 text-zinc-600">
                {isInvoice ? "N°" : "Réf."}{" "}
                <span className="font-mono font-semibold">
                  {r.invoice_number || r.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="text-zinc-600">
                Émis le{" "}
                {(issued ?? created).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Client</div>
              <div className="mt-1 font-semibold">{r.customer_name}</div>
              <div>{r.customer_phone}</div>
              <div>{r.customer_email}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Chauffeur</div>
              <div className="mt-1 font-semibold">{driver?.full_name ?? "—"}</div>
              {driver?.phone && <div>{driver.phone}</div>}
              {driver?.vehicle_model && (
                <div>
                  {driver.vehicle_model}
                  {driver.vehicle_plate ? ` · ${driver.vehicle_plate}` : ""}
                </div>
              )}
              {driver?.license_number && <div>Licence VTC : {driver.license_number}</div>}
            </div>
          </div>

          <div className="mt-8">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Prestation</div>
            <div className="mt-2 rounded-lg border border-zinc-200 p-4">
              <div className="grid grid-cols-[150px_1fr] gap-y-1">
                <div className="text-zinc-500">Date</div>
                <div className="font-medium">
                  {pickup.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <div className="text-zinc-500">Heure de départ</div>
                <div className="font-medium">
                  {pickup.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                {arrival && (
                  <>
                    <div className="text-zinc-500">Heure d'arrivée estimée</div>
                    <div className="font-medium">
                      {arrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </>
                )}
                <div className="text-zinc-500">Lieu de prise en charge</div>
                <div>{r.pickup_address}</div>
                <div className="text-zinc-500">Lieu de dépôt</div>
                <div>{r.dropoff_address}</div>
                {r.distance_km != null && (
                  <>
                    <div className="text-zinc-500">Distance</div>
                    <div>{Number(r.distance_km).toFixed(1)} km</div>
                  </>
                )}
                {durationMin != null && (
                  <>
                    <div className="text-zinc-500">Durée estimée</div>
                    <div>{Math.round(durationMin)} min</div>
                  </>
                )}
                {r.promo_code && (
                  <>
                    <div className="text-zinc-500">Code promo</div>
                    <div className="font-mono">{r.promo_code}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 ml-auto w-full max-w-xs space-y-1">
            {vatApplicable ? (
              <>
                <div className="flex justify-between">
                  <span>Total HT</span>
                  <span>{ht.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({vatRate}%)</span>
                  <span>{tva.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-semibold">
                  <span>Total TTC</span>
                  <span>{total.toFixed(2)} €</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            )}
            <div className="pt-1 text-xs text-zinc-500">
              Paiement : {r.payment_method === "card" ? "Carte" : "Espèces"}
              {r.payment_status === "paid" ? " (payé)" : ""}
            </div>
          </div>

          {!vatApplicable && (
            <div className="mt-6 text-xs text-zinc-500">
              TVA non applicable, art. 293 B du CGI.
            </div>
          )}

          {(company?.iban || company?.bic) && isInvoice && (
            <div className="mt-6 rounded-lg border border-zinc-200 p-3 text-xs">
              <div className="font-semibold text-zinc-700">Coordonnées bancaires</div>
              {company?.iban && <div>IBAN : {company.iban}</div>}
              {company?.bic && <div>BIC : {company.bic}</div>}
            </div>
          )}

          {company?.legal_mention && (
            <div className="mt-6 text-xs text-zinc-500">{company.legal_mention}</div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
