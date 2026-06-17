import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyClientReservations } from "@/lib/client.functions";
import { InvoicePdfButton } from "@/components/InvoicePdfButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  MapPin,
  CalendarDays,
  Phone,
  Mail,
  User,
  History,
  CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/espace-client")({
  component: EspaceClientPage,
  head: () => ({ meta: [{ title: "Espace Client — VTC Royal Prestige" }] }),
});

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function EspaceClientPage() {
  const navigate = useNavigate();
  const listMine = useServerFn(listMyClientReservations);

  const q = useQuery({
    queryKey: ["my-client-reservations"],
    queryFn: () => listMine(),
  });

  const { upcoming, past, lastCustomer } = useMemo(() => {
    const all = (q.data?.reservations ?? []) as any[];
    const now = Date.now();
    const upcoming = all
      .filter((r) => new Date(r.pickup_datetime).getTime() >= now && r.status !== "cancelled")
      .sort((a, b) => +new Date(a.pickup_datetime) - +new Date(b.pickup_datetime));
    const past = all
      .filter((r) => new Date(r.pickup_datetime).getTime() < now || r.status === "cancelled")
      .sort((a, b) => +new Date(b.pickup_datetime) - +new Date(a.pickup_datetime));
    const lastCustomer = all[0] ?? null;
    return { upcoming, past, lastCustomer };
  }, [q.data]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const email = q.data?.email;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <h1 className="font-semibold tracking-tight">Espace Client</h1>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {/* Profile */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Mes informations</h2>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {lastCustomer?.customer_name ?? "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  {email ?? "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  {lastCustomer?.customer_phone ?? "—"}
                </div>
              </div>
            </div>
            <Link to="/">
              <Button size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" /> Nouvelle réservation
              </Button>
            </Link>
          </div>
        </section>

        {/* Upcoming */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Réservations à venir</h2>
            <Badge variant="secondary" className="ml-2">
              {upcoming.length}
            </Badge>
          </div>

          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune réservation à venir pour le moment.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {upcoming.map((r) => (
                <ReservationCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Historique & factures</h2>
            <Badge variant="secondary" className="ml-2">
              {past.length}
            </Badge>
          </div>

          {past.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune course passée.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {past.map((r) => (
                <ReservationCard key={r.id} r={r} showInvoice />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ReservationCard({ r, showInvoice = false }: { r: any; showInvoice?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-sm font-medium">{formatDateTime(r.pickup_datetime)}</div>
        <Badge className={STATUS_COLORS[r.status] ?? ""}>
          {STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      </div>
      <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div>Départ : {r.pickup_address}</div>
          <div>Arrivée : {r.dropoff_address}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          {r.distance_km != null && <span>{Number(r.distance_km).toFixed(1)} km</span>}
          {r.duration_min != null && <span>{r.duration_min} min</span>}
          {r.estimated_price != null && (
            <span className="font-medium text-foreground">
              {Number(r.estimated_price).toFixed(2)} €
            </span>
          )}
          {r.invoice_number && <span>Facture n° {r.invoice_number}</span>}
        </div>
        {showInvoice && <InvoicePdfButton reservationId={r.id} />}
      </div>
    </div>
  );
}
