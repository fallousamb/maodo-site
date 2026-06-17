import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkIsAdmin,
  listReservations,
  updateReservationStatus,
  deleteReservation,
} from "@/lib/admin.functions";
import {
  adminListDrivers,
  adminUpdateDriverStatus,
  adminReassignReservation,
  adminCreateDriver,
} from "@/lib/drivers.functions";
import {
  adminGeneratePromoCodes,
  adminListPromoCodes,
  adminDeletePromoCode,
  getCompanySettings,
  adminUpdateCompanySettings,
} from "@/lib/billing.functions";
import { InvoicePdfButton } from "@/components/InvoicePdfButton";
import { AdminDriverDocumentsButton } from "@/components/AdminDriverDocumentsDialog";
import { AdminReviewsPanel } from "@/components/AdminReviewsPanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LogOut,
  Loader2,
  Trash2,
  ShieldAlert,
  Search,
  Check,
  X,
  UserPlus,
  Sparkles,
  Copy,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — VTC Royal Prestige" }] }),
});

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const DRIVER_STATUS: Record<string, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Refusé",
  suspended: "Suspendu",
};

const DRIVER_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-zinc-200 text-zinc-800",
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listReservations);
  const updateStatus = useServerFn(updateReservationStatus);
  const remove = useServerFn(deleteReservation);
  const listDrivers = useServerFn(adminListDrivers);
  const updateDriver = useServerFn(adminUpdateDriverStatus);
  const reassign = useServerFn(adminReassignReservation);

  const createDriver = useServerFn(adminCreateDriver);

  const [email, setEmail] = useState<string>("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const emptyDriver = {
    full_name: "",
    phone: "",
    email: "",
    vehicle_model: "",
    vehicle_plate: "",
    license_number: "",
    status: "approved" as "pending" | "approved" | "rejected" | "suspended",
  };
  const [newDriver, setNewDriver] = useState(emptyDriver);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => check() });

  const resQ = useQuery({
    queryKey: ["reservations"],
    queryFn: () => list(),
    enabled: adminQ.data?.isAdmin === true,
  });

  const driversQ = useQuery({
    queryKey: ["adminDrivers"],
    queryFn: () => listDrivers(),
    enabled: adminQ.data?.isAdmin === true,
  });

  const updateM = useMutation({
    mutationFn: (vars: { id: string; status: any }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Réservation supprimée");
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const driverM = useMutation({
    mutationFn: (vars: { id: string; status: any }) => updateDriver({ data: vars }),
    onSuccess: () => {
      toast.success("Chauffeur mis à jour");
      qc.invalidateQueries({ queryKey: ["adminDrivers"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const reassignM = useMutation({
    mutationFn: (vars: { reservation_id: string; driver_id: string | null }) =>
      reassign({ data: vars }),
    onSuccess: () => {
      toast.success("Course redispatchée");
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const createDriverM = useMutation({
    mutationFn: (vars: typeof emptyDriver) => createDriver({ data: vars }),
    onSuccess: () => {
      toast.success("Chauffeur ajouté");
      qc.invalidateQueries({ queryKey: ["adminDrivers"] });
      setNewDriver(emptyDriver);
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  // PROMO CODES
  const genPromo = useServerFn(adminGeneratePromoCodes);
  const listPromo = useServerFn(adminListPromoCodes);
  const delPromo = useServerFn(adminDeletePromoCode);
  const [promoQty, setPromoQty] = useState(10);
  const [promoPct, setPromoPct] = useState(10);
  const promoQ = useQuery({
    queryKey: ["promoCodes"],
    queryFn: () => listPromo(),
    enabled: adminQ.data?.isAdmin === true,
  });
  const genPromoM = useMutation({
    mutationFn: () =>
      genPromo({ data: { quantity: promoQty, discount_percent: promoPct, length: 8 } }),
    onSuccess: (res: any) => {
      toast.success(`${res.codes.length} code(s) généré(s)`);
      qc.invalidateQueries({ queryKey: ["promoCodes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
  const delPromoM = useMutation({
    mutationFn: (id: string) => delPromo({ data: { id } }),
    onSuccess: () => {
      toast.success("Code supprimé");
      qc.invalidateQueries({ queryKey: ["promoCodes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  // COMPANY SETTINGS
  const getCompany = useServerFn(getCompanySettings);
  const saveCompany = useServerFn(adminUpdateCompanySettings);
  const companyQ = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => getCompany(),
    enabled: adminQ.data?.isAdmin === true,
  });
  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    if (companyQ.data?.settings) setCompany(companyQ.data.settings);
  }, [companyQ.data]);
  const saveCompanyM = useMutation({
    mutationFn: (payload: any) => saveCompany({ data: payload }),
    onSuccess: () => {
      toast.success("Informations enregistrées");
      qc.invalidateQueries({ queryKey: ["companySettings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (adminQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (adminQ.data && !adminQ.data.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-lg rounded-2xl bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">Accès restreint</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre compte ({email}) n'a pas encore le rôle administrateur.
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4 text-left text-xs">
            <p className="font-medium mb-2">Pour activer l'accès admin :</p>
            <p className="text-muted-foreground">
              Ouvrez Lovable Cloud → Database → table <code>user_roles</code>, puis insérez une
              ligne avec votre <code>user_id</code> ({adminQ.data.userId}) et{" "}
              <code>role = "admin"</code>.
            </p>
          </div>
          <Button onClick={onLogout} variant="outline" className="mt-6 gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Espace Admin</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="reservations">
          <TabsList>
            <TabsTrigger value="reservations">Réservations</TabsTrigger>
            <TabsTrigger value="drivers">Chauffeurs</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
            <TabsTrigger value="promos">Codes promo</TabsTrigger>
            <TabsTrigger value="company">Entreprise</TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="mt-6">
            {resQ.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {resQ.data && resQ.data.reservations.length === 0 && (
              <div className="rounded-xl bg-card p-12 text-center shadow-card">
                <p className="text-muted-foreground">Aucune réservation pour le moment.</p>
              </div>
            )}
            {resQ.data && resQ.data.reservations.length > 0 && (
              <div className="overflow-x-auto rounded-xl bg-card shadow-card">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Trajet</th>
                      <th className="px-4 py-3 font-medium">Prix</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Chauffeur</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resQ.data.reservations.map((r: any) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(r.pickup_datetime).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            <a href={`tel:${r.customer_phone}`} className="hover:text-primary">
                              {r.customer_phone}
                            </a>
                            {" · "}
                            <a href={`mailto:${r.customer_email}`} className="hover:text-primary">
                              {r.customer_email}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-xs">
                            <div className="truncate">
                              <span className="font-medium text-primary">→</span> {r.pickup_address}
                            </div>
                            <div className="truncate">
                              <span className="font-medium text-destructive">⤓</span>{" "}
                              {r.dropoff_address}
                            </div>
                            {r.distance_km && (
                              <div className="text-muted-foreground">
                                {Number(r.distance_km).toFixed(1)} km
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">
                          {r.estimated_price ? `${Number(r.estimated_price).toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={r.status}
                            onValueChange={(v) => updateM.mutate({ id: r.id, status: v })}
                          >
                            <SelectTrigger
                              className={`h-8 w-[130px] text-xs ${STATUS_COLORS[r.status] ?? ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const approved = ((driversQ.data?.drivers ?? []) as any[]).filter(
                              (d) => d.status === "approved",
                            );
                            const currentId = r.driver?.id ?? "__none__";
                            const busy =
                              reassignM.isPending && reassignM.variables?.reservation_id === r.id;
                            return (
                              <Select
                                value={currentId}
                                disabled={busy}
                                onValueChange={(v) =>
                                  reassignM.mutate({
                                    reservation_id: r.id,
                                    driver_id: v === "__none__" ? null : v,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 w-[170px] text-xs">
                                  <SelectValue placeholder={r.driver?.name ?? "Non assigné"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Non assigné</SelectItem>
                                  {approved.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <InvoicePdfButton reservationId={r.id} iconOnly />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Supprimer cette réservation ?")) deleteM.mutate(r.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drivers" className="mt-6 space-y-4">
            {driversQ.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {driversQ.data &&
              (() => {
                const all = driversQ.data.drivers as any[];
                const counts = all.reduce<Record<string, number>>((acc, d) => {
                  acc[d.status] = (acc[d.status] ?? 0) + 1;
                  return acc;
                }, {});
                const q = driverSearch.trim().toLowerCase();
                const filtered = all.filter((d) => {
                  if (driverFilter !== "all" && d.status !== driverFilter) return false;
                  if (!q) return true;
                  return [
                    d.full_name,
                    d.email,
                    d.phone,
                    d.vehicle_model,
                    d.vehicle_plate,
                    d.license_number,
                  ]
                    .filter(Boolean)
                    .some((v: string) => String(v).toLowerCase().includes(q));
                });

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold">Chauffeurs</h2>
                      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2">
                            <UserPlus className="h-4 w-4" /> Ajouter un chauffeur
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Nouveau chauffeur</DialogTitle>
                            <DialogDescription>
                              Créez rapidement une fiche chauffeur. Elle pourra être assignée à des
                              courses immédiatement.
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            className="grid gap-3 sm:grid-cols-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              createDriverM.mutate(newDriver);
                            }}
                          >
                            <div className="sm:col-span-2">
                              <Label className="text-xs">Nom complet *</Label>
                              <Input
                                required
                                value={newDriver.full_name}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, full_name: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Téléphone *</Label>
                              <Input
                                required
                                value={newDriver.phone}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, phone: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Email *</Label>
                              <Input
                                type="email"
                                required
                                value={newDriver.email}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, email: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Modèle véhicule</Label>
                              <Input
                                value={newDriver.vehicle_model}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, vehicle_model: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Plaque</Label>
                              <Input
                                value={newDriver.vehicle_plate}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, vehicle_plate: e.target.value })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs">N° licence VTC</Label>
                              <Input
                                value={newDriver.license_number}
                                onChange={(e) =>
                                  setNewDriver({ ...newDriver, license_number: e.target.value })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs">Statut initial</Label>
                              <Select
                                value={newDriver.status}
                                onValueChange={(v) =>
                                  setNewDriver({ ...newDriver, status: v as any })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(DRIVER_STATUS).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter className="sm:col-span-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                              >
                                Annuler
                              </Button>
                              <Button
                                type="submit"
                                disabled={createDriverM.isPending}
                                className="gap-2"
                              >
                                {createDriverM.isPending && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Créer
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card md:flex-row md:items-center md:justify-between">
                      <div className="relative md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher (nom, email, plaque…)"
                          value={driverSearch}
                          onChange={(e) => setDriverSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["all", "pending", "approved", "rejected", "suspended"] as const).map(
                          (k) => (
                            <Button
                              key={k}
                              type="button"
                              size="sm"
                              variant={driverFilter === k ? "default" : "outline"}
                              onClick={() => setDriverFilter(k)}
                              className="h-8 text-xs"
                            >
                              {k === "all" ? "Tous" : DRIVER_STATUS[k]}
                              <span className="ml-1.5 rounded bg-background/40 px-1.5 text-[10px]">
                                {k === "all" ? all.length : (counts[k] ?? 0)}
                              </span>
                            </Button>
                          ),
                        )}
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="rounded-xl bg-card p-12 text-center shadow-card">
                        <p className="text-muted-foreground">
                          {all.length === 0
                            ? "Aucun chauffeur inscrit."
                            : "Aucun chauffeur ne correspond à ces filtres."}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border bg-muted/50">
                            <tr className="text-left">
                              <th className="px-4 py-3 font-medium">Chauffeur</th>
                              <th className="px-4 py-3 font-medium">Contact</th>
                              <th className="px-4 py-3 font-medium">Véhicule</th>
                              <th className="px-4 py-3 font-medium">Licence</th>
                              <th className="px-4 py-3 font-medium">Statut</th>
                              <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((d: any) => {
                              const busy = driverM.isPending && driverM.variables?.id === d.id;
                              return (
                                <tr key={d.id} className="border-b border-border last:border-0">
                                  <td className="px-4 py-3 font-medium">{d.full_name}</td>
                                  <td className="px-4 py-3 text-xs">
                                    <div>
                                      <a href={`tel:${d.phone}`} className="hover:text-primary">
                                        {d.phone}
                                      </a>
                                    </div>
                                    <div className="text-muted-foreground">
                                      <a href={`mailto:${d.email}`} className="hover:text-primary">
                                        {d.email}
                                      </a>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs">
                                    <div>
                                      {[d.vehicle_brand, d.vehicle_model].filter(Boolean).join(" ") || "—"}
                                      {d.vehicle_year ? ` (${d.vehicle_year})` : ""}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {[d.vehicle_type, d.vehicle_color].filter(Boolean).join(" · ")}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {d.vehicle_plate ?? ""}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs">{d.license_number ?? "—"}</td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      className={`${DRIVER_BADGE[d.status] ?? ""} font-medium`}
                                      variant="secondary"
                                    >
                                      {DRIVER_STATUS[d.status] ?? d.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                      <AdminDriverDocumentsButton
                                        driverId={d.id}
                                        driverName={d.full_name}
                                      />
                                      {d.status !== "approved" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 gap-1 text-green-700 hover:bg-green-50"
                                          disabled={busy}
                                          onClick={() =>
                                            driverM.mutate({ id: d.id, status: "approved" })
                                          }
                                        >
                                          <Check className="h-3.5 w-3.5" /> Approuver
                                        </Button>
                                      )}
                                      {d.status !== "rejected" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                                          disabled={busy}
                                          onClick={() =>
                                            driverM.mutate({ id: d.id, status: "rejected" })
                                          }
                                        >
                                          <X className="h-3.5 w-3.5" /> Refuser
                                        </Button>
                                      )}
                                      <Select
                                        value={d.status}
                                        onValueChange={(v) =>
                                          driverM.mutate({ id: d.id, status: v })
                                        }
                                      >
                                        <SelectTrigger className="h-8 w-[120px] text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(DRIVER_STATUS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>
                                              {v}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <AdminReviewsPanel />
          </TabsContent>

          <TabsContent value="promos" className="mt-6 space-y-6">

            <div className="rounded-xl bg-card p-6 shadow-card">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Générer un lot de codes promo
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Chaque code est aléatoire et à usage unique. Une fois utilisé par un client, il
                devient invalide.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[140px_140px_auto]">
                <div>
                  <Label className="text-xs">Quantité</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={promoQty}
                    onChange={(e) =>
                      setPromoQty(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Réduction (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={promoPct}
                    onChange={(e) =>
                      setPromoPct(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => genPromoM.mutate()}
                    disabled={genPromoM.isPending}
                    className="gap-2"
                  >
                    {genPromoM.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Générer
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Réduction</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Créé le</th>
                    <th className="px-4 py-3 font-medium">Utilisé le</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {promoQ.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center">
                        <Loader2 className="inline h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {promoQ.data?.codes?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        Aucun code généré.
                      </td>
                    </tr>
                  )}
                  {(promoQ.data?.codes ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                      <td className="px-4 py-3">-{Number(c.discount_percent)}%</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            c.used ? "bg-zinc-200 text-zinc-700" : "bg-green-100 text-green-800"
                          }
                        >
                          {c.used ? "Utilisé" : "Actif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.used_at ? new Date(c.used_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            toast.success("Code copié");
                          }}
                          className="gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => delPromoM.mutate(c.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <div className="rounded-xl bg-card p-6 shadow-card">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Informations entreprise
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ces informations apparaissent sur les bons de commande et les factures.
              </p>
              {!company ? (
                <div className="py-6 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin" />
                </div>
              ) : (
                <form
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveCompanyM.mutate({
                      ...company,
                      vat_rate: Number(company.vat_rate) || 0,
                      vat_applicable: !!company.vat_applicable,
                    });
                  }}
                >
                  {(
                    [
                      ["company_name", "Nom de l'entreprise *"],
                      ["legal_form", "Forme juridique (SARL, EI…)"],
                      ["siret", "SIRET"],
                      ["vat_number", "N° TVA intracom."],
                      ["address", "Adresse"],
                      ["postal_code", "Code postal"],
                      ["city", "Ville"],
                      ["country", "Pays"],
                      ["phone", "Téléphone"],
                      ["email", "Email"],
                      ["iban", "IBAN"],
                      ["bic", "BIC"],
                      ["logo_url", "URL du logo"],
                    ] as const
                  ).map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={(company as any)[k] ?? ""}
                        onChange={(e) => setCompany({ ...company, [k]: e.target.value })}
                        required={k === "company_name"}
                      />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs">Taux TVA (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={company.vat_rate ?? 10}
                      onChange={(e) => setCompany({ ...company, vat_rate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <input
                      id="vat_applicable"
                      type="checkbox"
                      checked={!!company.vat_applicable}
                      onChange={(e) => setCompany({ ...company, vat_applicable: e.target.checked })}
                    />
                    <Label htmlFor="vat_applicable" className="text-sm">
                      Assujetti à la TVA
                    </Label>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Mention légale (pied de facture)</Label>
                    <Input
                      value={company.legal_mention ?? ""}
                      onChange={(e) => setCompany({ ...company, legal_mention: e.target.value })}
                      placeholder="Ex : Pénalités de retard..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={saveCompanyM.isPending} className="gap-2">
                      {saveCompanyM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
