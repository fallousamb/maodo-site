import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyDriver,
  registerDriver,
  listMyAvailabilities,
  addAvailability,
  deleteAvailability,
  listMyAssignedReservations,
  confirmReservationByDriver,
  completeReservationByDriver,
} from "@/lib/drivers.functions";
import { rejectAssignedReservation } from "@/lib/tracking.functions";
import { InvoicePdfButton } from "@/components/InvoicePdfButton";
import { DriverDocumentsSection } from "@/components/DriverDocumentsSection";
import { DriverVehicleSection } from "@/components/DriverVehicleSection";
import { DriverCourseTracker } from "@/components/DriverCourseTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Trash2,
  Plus,
  CheckCircle2,
  MapPin,
  CalendarCheck,
  Clock,
  Euro,
  CalendarDays,
  FileCheck2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/espace-chauffeur")({
  component: EspaceChauffeurPage,
  head: () => ({ meta: [{ title: "Espace Chauffeur — VTC Royal Prestige" }] }),
});

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de validation",
  approved: "Validé",
  rejected: "Refusé",
  suspended: "Suspendu",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-gray-200 text-gray-800",
};

function EspaceChauffeurPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getMine = useServerFn(getMyDriver);
  const register = useServerFn(registerDriver);
  const listSlots = useServerFn(listMyAvailabilities);
  const addSlot = useServerFn(addAvailability);
  const delSlot = useServerFn(deleteAvailability);
  const listResv = useServerFn(listMyAssignedReservations);
  const confirmResv = useServerFn(confirmReservationByDriver);
  const completeResv = useServerFn(completeReservationByDriver);
  const rejectResv = useServerFn(rejectAssignedReservation);

  const meQ = useQuery({
    queryKey: ["my-driver"],
    queryFn: () => getMine(),
  });

  const slotsQ = useQuery({
    queryKey: ["my-availabilities"],
    queryFn: () => listSlots(),
    enabled: !!meQ.data?.driver && meQ.data.driver.status === "approved",
  });

  const resvQ = useQuery({
    queryKey: ["my-assigned-reservations"],
    queryFn: () => listResv(),
    enabled: !!meQ.data?.driver && meQ.data.driver.status === "approved",
  });

  const confirmM = useMutation({
    mutationFn: (reservation_id: string) => confirmResv({ data: { reservation_id } }),
    onSuccess: () => {
      toast.success("Réservation validée — confirmation envoyée au client");
      qc.invalidateQueries({ queryKey: ["my-assigned-reservations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const completeM = useMutation({
    mutationFn: (reservation_id: string) => completeResv({ data: { reservation_id } }),
    onSuccess: (res: any) => {
      toast.success(`Facture ${res.invoice_number} générée`);
      qc.invalidateQueries({ queryKey: ["my-assigned-reservations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const rejectM = useMutation({
    mutationFn: (reservation_id: string) => rejectResv({ data: { reservation_id } }),
    onSuccess: () => {
      toast.success("Course refusée — l'administrateur va la réassigner");
      qc.invalidateQueries({ queryKey: ["my-assigned-reservations"] });
      qc.invalidateQueries({ queryKey: ["my-availabilities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const registerM = useMutation({
    mutationFn: (data: any) => register({ data }),
    onSuccess: () => {
      toast.success("Profil envoyé. En attente de validation.");
      qc.invalidateQueries({ queryKey: ["my-driver"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const addSlotM = useMutation({
    mutationFn: (data: { start_at: string; end_at: string }) => addSlot({ data }),
    onSuccess: () => {
      toast.success("Créneau ajouté");
      qc.invalidateQueries({ queryKey: ["my-availabilities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const delSlotM = useMutation({
    mutationFn: (id: string) => delSlot({ data: { id } }),
    onSuccess: () => {
      toast.success("Créneau supprimé");
      qc.invalidateQueries({ queryKey: ["my-availabilities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    vehicle_model: "",
    vehicle_plate: "",
    license_number: "",
  });
  const [slot, setSlot] = useState({ start_at: "", end_at: "" });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (meQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const driver = meQ.data?.driver;

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
          <h1 className="font-semibold tracking-tight">Espace Chauffeur</h1>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {!driver && (
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="text-xl font-semibold">Inscription chauffeur</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Renseignez vos informations. Votre profil sera validé par un administrateur.
            </p>
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                registerM.mutate(form);
              }}
            >
              <Input
                placeholder="Nom complet"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <Input
                placeholder="Téléphone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Modèle véhicule"
                value={form.vehicle_model}
                onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              />
              <Input
                placeholder="Plaque immatriculation"
                value={form.vehicle_plate}
                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
              />
              <Input
                placeholder="Numéro de licence VTC"
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={registerM.isPending} className="gap-2">
                  {registerM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Envoyer ma demande
                </Button>
              </div>
            </form>
          </section>
        )}

        {driver && (
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{driver.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {driver.email} · {driver.phone}
                </p>
                {driver.vehicle_model && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {driver.vehicle_model}
                    {driver.vehicle_plate ? ` · ${driver.vehicle_plate}` : ""}
                  </p>
                )}
              </div>
              <Badge className={STATUS_COLORS[driver.status] ?? ""}>
                {STATUS_LABELS[driver.status] ?? driver.status}
              </Badge>
            </div>
            {driver.status === "pending" && (
              <p className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                Votre profil est en attente de validation par l'administrateur.
              </p>
            )}
            {driver.status === "rejected" && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                Votre profil a été refusé. Contactez l'administrateur.
              </p>
            )}
          </section>
        )}

        {driver && (
          <>
            <DriverVehicleSection driver={driver} />
            <DriverDocumentsSection driverId={driver.id} />
          </>
        )}

        {driver?.status === "approved" &&
          (() => {
            const all = (resvQ.data?.reservations ?? []) as any[];
            const now = new Date();
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
            const startWeek = new Date(startToday);
            startWeek.setDate(startToday.getDate() - startToday.getDay()); // Sunday-start; ok for synthèse
            const endWeek = new Date(startWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

            const upcoming = all
              .filter((r) => new Date(r.pickup_datetime) >= now)
              .sort((a, b) => +new Date(a.pickup_datetime) - +new Date(b.pickup_datetime));
            const next = upcoming[0];

            const todayList = all.filter((r) => {
              const d = new Date(r.pickup_datetime);
              return d >= startToday && d < endToday;
            });
            const weekList = all.filter((r) => {
              const d = new Date(r.pickup_datetime);
              return d >= startWeek && d < endWeek;
            });
            const pendingCount = all.filter((r) => r.status !== "confirmed").length;
            const confirmedCount = all.filter((r) => r.status === "confirmed").length;
            const weekRevenue = weekList.reduce(
              (sum, r) => sum + (Number(r.estimated_price) || 0),
              0,
            );

            const stats = [
              {
                label: "Aujourd'hui",
                value: todayList.length,
                icon: CalendarDays,
                hint: `${todayList.length} course${todayList.length > 1 ? "s" : ""} prévue${todayList.length > 1 ? "s" : ""}`,
              },
              {
                label: "Cette semaine",
                value: weekList.length,
                icon: CalendarCheck,
                hint: `${weekRevenue.toFixed(0)} € estimés`,
              },
              {
                label: "À valider",
                value: pendingCount,
                icon: Clock,
                hint: `${confirmedCount} déjà confirmée${confirmedCount > 1 ? "s" : ""}`,
              },
              {
                label: "CA semaine",
                value: `${weekRevenue.toFixed(0)} €`,
                icon: Euro,
                hint: "Estimation totale",
              },
            ];

            return (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Tableau de bord</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Synthèse rapide de votre activité.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.label}
                        className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {s.label}
                          </span>
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="mt-2 text-2xl font-semibold">{s.value}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
                      </div>
                    );
                  })}
                </div>

                {next && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-primary">
                          Prochaine course
                        </div>
                        <div className="mt-1 text-base font-semibold">
                          {new Date(next.pickup_datetime).toLocaleString("fr-FR", {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {next.customer_name} · {next.customer_phone}
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div>Départ : {next.pickup_address}</div>
                            <div>Arrivée : {next.dropoff_address}</div>
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          next.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {next.status === "confirmed" ? "Confirmée" : "En attente"}
                      </Badge>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

        {driver?.status === "approved" && (
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="text-xl font-semibold">Mes disponibilités</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez des créneaux pendant lesquels vous pouvez accepter des courses.
            </p>

            <form
              className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!slot.start_at || !slot.end_at) return;
                addSlotM.mutate(slot, {
                  onSuccess: () => setSlot({ start_at: "", end_at: "" }),
                });
              }}
            >
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Début</label>
                <Input
                  type="datetime-local"
                  required
                  value={slot.start_at}
                  onChange={(e) => setSlot({ ...slot, start_at: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Fin</label>
                <Input
                  type="datetime-local"
                  required
                  value={slot.end_at}
                  onChange={(e) => setSlot({ ...slot, end_at: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={addSlotM.isPending} className="gap-2">
                  {addSlotM.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Ajouter
                </Button>
              </div>
            </form>

            <div className="mt-6 space-y-2">
              {slotsQ.isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {slotsQ.data?.availabilities?.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun créneau pour le moment.</p>
              )}
              {(slotsQ.data?.availabilities ?? []).map((s: any) => {
                const start = new Date(s.start_at);
                const end = new Date(s.end_at);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {start.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}{" "}
                        → {end.toLocaleString("fr-FR", { timeStyle: "short" })}
                      </div>
                      {s.reservation_id && (
                        <div className="mt-0.5 text-xs text-primary">Réservation assignée</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!!s.reservation_id || delSlotM.isPending}
                      onClick={() => delSlotM.mutate(s.id)}
                      className="gap-2 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {driver?.status === "approved" && (
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="text-xl font-semibold">Bons de commande & factures</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Validez la réservation, consultez le bon de commande, puis générez la facture en fin
              de course.
            </p>

            <div className="mt-6 space-y-3">
              {resvQ.isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {resvQ.data?.reservations?.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune réservation pour le moment.</p>
              )}
              {(resvQ.data?.reservations ?? []).map((r: any) => {
                const when = new Date(r.pickup_datetime);
                const confirmed = r.status === "confirmed" || r.status === "completed";
                const completed = !!r.invoice_number;
                return (
                  <div key={r.id} className="rounded-lg border border-border/60 bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-semibold">
                          {when.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {r.customer_name} · {r.customer_phone}
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div>Départ : {r.pickup_address}</div>
                            <div>Arrivée : {r.dropoff_address}</div>
                          </div>
                        </div>
                        {r.estimated_price && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Estimation : {Number(r.estimated_price).toFixed(2)} €
                          </div>
                        )}
                        {completed && (
                          <div className="mt-1 text-xs text-primary">
                            Facture <span className="font-mono">{r.invoice_number}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={
                            completed
                              ? "bg-emerald-100 text-emerald-800"
                              : confirmed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {completed ? "Terminée" : confirmed ? "Confirmée" : "En attente"}
                        </Badge>
                        {!confirmed && (
                          <>
                            <Button
                              size="sm"
                              disabled={confirmM.isPending}
                              onClick={() => confirmM.mutate(r.id)}
                              className="gap-2"
                            >
                              {confirmM.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rejectM.isPending}
                              onClick={() => {
                                if (confirm("Refuser cette course ? Elle sera réassignée par l'administrateur.")) {
                                  rejectM.mutate(r.id);
                                }
                              }}
                              className="gap-2 text-destructive"
                            >
                              <X className="h-4 w-4" /> Refuser
                            </Button>
                          </>
                        )}
                        <InvoicePdfButton
                          reservationId={r.id}
                          label={completed ? "Voir facture" : "Bon de commande"}
                        />
                        {confirmed && !completed && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={completeM.isPending}
                            onClick={() => completeM.mutate(r.id)}
                            className="gap-2"
                          >
                            {completeM.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck2 className="h-4 w-4" />
                            )}
                            Course terminée
                          </Button>
                        )}
                      </div>
                    </div>
                    {confirmed && (
                      <DriverCourseTracker reservationId={r.id} completed={completed} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
