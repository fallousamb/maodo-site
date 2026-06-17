import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateMyVehicle } from "@/lib/driver-documents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Car } from "lucide-react";

export function DriverVehicleSection({ driver }: { driver: any }) {
  const saveFn = useServerFn(updateMyVehicle);
  const [form, setForm] = useState({
    vehicle_type: driver.vehicle_type ?? "",
    vehicle_brand: driver.vehicle_brand ?? "",
    vehicle_model: driver.vehicle_model ?? "",
    vehicle_year: driver.vehicle_year ?? "",
    vehicle_color: driver.vehicle_color ?? "",
    vehicle_plate: driver.vehicle_plate ?? "",
  });

  useEffect(() => {
    setForm({
      vehicle_type: driver.vehicle_type ?? "",
      vehicle_brand: driver.vehicle_brand ?? "",
      vehicle_model: driver.vehicle_model ?? "",
      vehicle_year: driver.vehicle_year ?? "",
      vehicle_color: driver.vehicle_color ?? "",
      vehicle_plate: driver.vehicle_plate ?? "",
    });
  }, [driver.id]);

  const saveM = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          vehicle_type: form.vehicle_type || null,
          vehicle_brand: form.vehicle_brand || null,
          vehicle_model: form.vehicle_model || null,
          vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
          vehicle_color: form.vehicle_color || null,
          vehicle_plate: form.vehicle_plate || null,
        },
      }),
    onSuccess: () => toast.success("Véhicule mis à jour"),
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Car className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Mon véhicule</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Renseignez les caractéristiques de votre véhicule.
      </p>
      <form
        className="mt-6 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveM.mutate();
        }}
      >
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Type (berline, SUV...)</label>
          <Input
            value={form.vehicle_type}
            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Marque</label>
          <Input
            value={form.vehicle_brand}
            onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Modèle</label>
          <Input
            value={form.vehicle_model}
            onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Année</label>
          <Input
            type="number"
            min={1980}
            max={2100}
            value={form.vehicle_year}
            onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Couleur</label>
          <Input
            value={form.vehicle_color}
            onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Immatriculation</label>
          <Input
            value={form.vehicle_plate}
            onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saveM.isPending} className="gap-2">
            {saveM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </section>
  );
}
