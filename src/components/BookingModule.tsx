import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Calculator,
  Loader2,
  Send,
  CheckCircle2,
  Plus,
  X,
  Repeat,
  LocateFixed,
} from "lucide-react";
import { computeRoute, reverseGeocode } from "@/lib/route.functions";
import { createReservation, countReservationsByEmail } from "@/lib/reservations.functions";
import { listAvailableSlots } from "@/lib/drivers.functions";
import { createCheckoutSession } from "@/lib/payments.functions";
import { validatePromoCode } from "@/lib/billing.functions";
import { computeBasePrice, MIN_PRICE, isLoyaltyFreeRide } from "@/lib/pricing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressInput } from "@/components/AddressInput";

interface RouteResult {
  distanceKm: number;
  durationMin: number;
}

export function BookingModule() {
  const compute = useServerFn(computeRoute);
  const reverse = useServerFn(reverseGeocode);
  const reserve = useServerFn(createReservation);
  const countRes = useServerFn(countReservationsByEmail);
  const checkout = useServerFn(createCheckoutSession);
  const fetchSlots = useServerFn(listAvailableSlots);


  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [roundTrip, setRoundTrip] = useState(false);
  const [waitMin, setWaitMin] = useState(0);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [locating, setLocating] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [datetime, setDatetime] = useState("");
  const [slots, setSlots] = useState<Array<{ id: string; start_at: string; end_at: string; driver_first_name: string }>>([]);
  const [slotId, setSlotId] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("cash");

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    fetchSlots()
      .then((r) => {
        if (!cancelled) setSlots(r.slots);
      })
      .catch((e) => console.error("slots", e))
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSlots]);


  // Promo & fidélité
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0); // pourcentage 0-100
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const validatePromo = useServerFn(validatePromoCode);
  const [loyaltyFree, setLoyaltyFree] = useState(false);
  const [loyaltyCount, setLoyaltyCount] = useState<number | null>(null);
  const [checkingLoyalty, setCheckingLoyalty] = useState(false);

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;

  const pickupDateForPrice = datetime ? new Date(datetime) : new Date();
  const basePrice = route
    ? computeBasePrice({ distanceKm: route.distanceKm, waitMin, pickupDate: pickupDateForPrice })
    : null;
  const price = route
    ? loyaltyFree
      ? 0
      : Math.max(basePrice! * (1 - promoDiscount / 100), 0)
    : null;

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoApplied(null);
      setPromoDiscount(0);
      setPromoError(null);
      return;
    }
    setPromoChecking(true);
    try {
      const res = await validatePromo({ data: { code } });
      if (res.valid) {
        setPromoApplied(res.code!);
        setPromoDiscount(res.discount_percent!);
        setPromoError(null);
        toast.success(`Code ${res.code} appliqué : -${res.discount_percent}%`);
      } else {
        setPromoApplied(null);
        setPromoDiscount(0);
        setPromoError(res.reason || "Code promo invalide.");
      }
    } catch (e: any) {
      setPromoApplied(null);
      setPromoDiscount(0);
      setPromoError(e?.message || "Erreur de validation");
    } finally {
      setPromoChecking(false);
    }
  };

  const checkLoyalty = async (value: string) => {
    const v = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setLoyaltyFree(false);
      setLoyaltyCount(null);
      return;
    }
    setCheckingLoyalty(true);
    try {
      const { count } = await countRes({ data: { email: v } });
      setLoyaltyCount(count);
      const free = isLoyaltyFreeRide(count);
      setLoyaltyFree(free);
      if (free) toast.success("🎁 Votre 11ème course est offerte !");
    } catch (e) {
      console.error(e);
      setLoyaltyFree(false);
      setLoyaltyCount(null);
    } finally {
      setCheckingLoyalty(false);
    }
  };

  const addStop = () => {
    if (stops.length >= 5) return;
    setStops([...stops, ""]);
  };
  const updateStop = (i: number, v: string) => {
    const next = [...stops];
    next[i] = v;
    setStops(next);
  };
  const removeStop = (i: number) => setStops(stops.filter((_, k) => k !== i));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { address } = await reverse({
            data: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          setPickup(address);
          toast.success("Position récupérée !");
        } catch (e) {
          console.error(e);
          toast.error("Impossible de trouver votre adresse.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error(err);
        toast.error("Accès à la position refusé.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onCalculate = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      toast.error("Renseignez les adresses de départ et d'arrivée.");
      return;
    }
    setComputing(true);
    try {
      const r = await compute({
        data: {
          origin: pickup,
          destination: dropoff,
          waypoints: stops.filter((s) => s.trim().length > 2),
          roundTrip,
        },
      });
      setRoute(r);
      toast.success("Trajet calculé !");
    } catch (e) {
      console.error(e);
      toast.error("Impossible de calculer ce trajet. Vérifiez les adresses.");
    } finally {
      setComputing(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || price === null) {
      toast.error("Calculez d'abord votre trajet.");
      return;
    }
    setSubmitting(true);
    try {
      const fullDropoff = roundTrip ? `${dropoff} → retour ${pickup}` : dropoff;
      const stopsNote = stops.filter((s) => s.trim()).length
        ? `\nÉtapes : ${stops.filter((s) => s.trim()).join(" → ")}`
        : "";
      const { id } = await reserve({
        data: {
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          pickup_address: pickup,
          dropoff_address: fullDropoff,
          pickup_datetime: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
          availability_id: slotId || null,
          distance_km: Number(route.distanceKm.toFixed(2)),
          duration_min: Number(route.durationMin.toFixed(1)),
          estimated_price: Number(price.toFixed(2)),
          message: (message || "") + stopsNote || null,
          payment_method: paymentMethod,
          promo_code: promoApplied || null,
        },
      });

      if (paymentMethod === "card" && !loyaltyFree && price > 0) {
        toast.info("Redirection vers le paiement sécurisé…");
        const { url } = await checkout({
          data: {
            reservation_id: id,
            origin: window.location.origin,
          },
        });
        window.location.href = url;
        return;
      }

      setDone(true);
      toast.success("Réservation envoyée !");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'envoi de la réservation.");
    } finally {
      setSubmitting(false);
    }
  };


  if (done) {
    return (
      <div className="rounded-2xl bg-card p-10 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h3 className="mt-4 text-2xl font-semibold">Demande envoyée</h3>
        <p className="mt-2 text-muted-foreground">
          Merci {name.split(" ")[0]} ! Je vous recontacte rapidement au {phone} pour confirmer
          votre course.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setDone(false);
            setRoute(null);
            setPickup("");
            setDropoff("");
            setStops([]);
            setRoundTrip(false);
            setName("");
            setPhone("");
            setEmail("");
            setDatetime("");
            setSlotId("");
            setMessage("");
            setWaitMin(0);
            setPromoCode("");
            setPromoApplied(null);
            setPromoError(null);
            setLoyaltyFree(false);
            setLoyaltyCount(null);
          }}
        >
          Nouvelle réservation
        </Button>
      </div>
    );
  }

  // Map embed (round trip & waypoints supported by Embed API "directions")
  const mapWaypoints = [
    ...stops.filter((s) => s.trim().length > 2),
    ...(roundTrip ? [dropoff] : []),
  ];
  const mapDest = roundTrip ? pickup : dropoff;
  const mapSrc =
    browserKey && route
      ? `https://www.google.com/maps/embed/v1/directions?key=${browserKey}&origin=${encodeURIComponent(
          pickup,
        )}&destination=${encodeURIComponent(mapDest)}${
          mapWaypoints.length
            ? `&waypoints=${mapWaypoints.map(encodeURIComponent).join("|")}`
            : ""
        }&mode=driving&language=fr`
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Calculator */}
      <div className="lg:col-span-3 space-y-4 rounded-2xl bg-card p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-2 text-primary">
          <Calculator className="h-5 w-5" />
          <h3 className="text-xl font-semibold text-foreground">Estimer ma course</h3>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pickup" className="text-sm">
                Adresse de départ
              </Label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {locating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LocateFixed className="h-3 w-3" />
                )}
                Ma position
              </button>
            </div>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary" />
              <AddressInput
                id="pickup"
                value={pickup}
                onChange={setPickup}
                placeholder="Ex : 10 av. Charles de Gaulle, Rochefort"
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              />
            </div>
          </div>

          {/* Stops */}
          {stops.map((s, i) => (
            <div key={i}>
              <Label className="text-sm">Étape {i + 1}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <AddressInput
                    value={s}
                    onChange={(v) => updateStop(i, v)}
                    placeholder="Adresse intermédiaire"
                    className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => removeStop(i)}
                  aria-label="Retirer l'étape"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div>
            <Label htmlFor="dropoff" className="text-sm">
              Adresse d'arrivée
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-destructive" />
              <AddressInput
                id="dropoff"
                value={dropoff}
                onChange={setDropoff}
                placeholder="Ex : Aéroport de La Rochelle"
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStop}
              disabled={stops.length >= 5}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une étape
            </Button>
            <Button
              type="button"
              variant={roundTrip ? "default" : "outline"}
              size="sm"
              onClick={() => setRoundTrip(!roundTrip)}
              className="gap-1"
            >
              <Repeat className="h-3.5 w-3.5" /> Aller-retour
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="slot" className="text-sm">
                Créneau chauffeur
              </Label>
              <select
                id="slot"
                value={slotId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSlotId(id);
                  const s = slots.find((x) => x.id === id);
                  if (s) {
                    // datetime-local format YYYY-MM-DDTHH:mm in local TZ
                    const d = new Date(s.start_at);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    setDatetime(
                      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
                    );
                  } else {
                    setDatetime("");
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">
                  {loadingSlots
                    ? "Chargement…"
                    : slots.length === 0
                      ? "Aucun créneau disponible"
                      : "Choisir un créneau"}
                </option>
                {slots.map((s) => {
                  const d = new Date(s.start_at);
                  const label = d.toLocaleString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <option key={s.id} value={s.id}>
                      {label} — {s.driver_first_name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <Label htmlFor="wait" className="text-sm flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Attente (min)
              </Label>
              <Input
                id="wait"
                type="number"
                min={0}
                max={600}
                value={waitMin}
                onChange={(e) => setWaitMin(Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="datetime" className="text-sm">
              Date & heure souhaitées
            </Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={datetime}
              onChange={(e) => {
                setDatetime(e.target.value);
                setSlotId("");
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez un créneau chauffeur ci-dessus, ou saisissez la date de votre choix.
            </p>
          </div>

          <Button onClick={onCalculate} disabled={computing} className="w-full" size="lg">
            {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculer mon trajet"}
          </Button>
        </div>

        {/* Map */}
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {mapSrc ? (
            <iframe
              title="Itinéraire"
              src={mapSrc}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4" /> L'itinéraire s'affichera ici après le calcul
            </div>
          )}
        </div>

        {/* Code promo */}
        {route && (
          <div className="rounded-xl border border-border bg-card p-4">
            <Label htmlFor="promo" className="text-sm font-medium">
              Code promo
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="promo"
                placeholder="Votre code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoApplied(null);
                  setPromoDiscount(0);
                  setPromoError(null);
                }}
                className="uppercase"
              />
              <Button type="button" variant="outline" onClick={applyPromo} disabled={promoChecking}>
                {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
              </Button>
            </div>
            {promoApplied && (
              <p className="mt-2 text-xs text-primary">
                ✓ Code <strong>{promoApplied}</strong> appliqué (-{promoDiscount}%)
              </p>
            )}
            {promoError && (
              <p className="mt-2 text-xs text-destructive">{promoError}</p>
            )}
          </div>
        )}

        {/* Estimation — montant final uniquement */}
        {route && price !== null && basePrice !== null && (
          <div className="rounded-xl bg-soft-gradient p-6 text-center border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Tarif estimé
            </div>
            {loyaltyFree ? (
              <>
                <div className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold text-primary">
                  <span className="text-2xl line-through text-muted-foreground/60">
                    {basePrice.toFixed(2)} €
                  </span>
                  <span>OFFERTE 🎁</span>
                </div>
                <p className="mt-2 text-xs text-primary">
                  Votre 11ème course est offerte — merci pour votre fidélité !
                </p>
              </>
            ) : promoApplied ? (
              <>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-xl line-through text-muted-foreground/60">
                    {basePrice.toFixed(2)} €
                  </span>
                  <span className="text-4xl font-bold text-primary">
                    {price.toFixed(2)} €
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Remise {promoApplied} appliquée. Estimation indicative TTC.
                </p>
              </>
            ) : (
              <>
                <div className="mt-1 text-4xl font-bold text-primary">
                  {price.toFixed(2)} €
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Course minimum {MIN_PRICE} €. Estimation indicative TTC.
                </p>
              </>
            )}
            {loyaltyCount !== null && !loyaltyFree && (
              <p className="mt-2 text-xs text-muted-foreground">
                Réservations effectuées : <strong>{loyaltyCount}</strong> · La 11ème est offerte 🎁
              </p>
            )}
          </div>
        )}
      </div>

      {/* Reservation form */}
      <form
        onSubmit={onSubmit}
        className="lg:col-span-2 space-y-4 rounded-2xl bg-card p-6 sm:p-8 shadow-card"
      >
        <div className="flex items-center gap-2 text-primary">
          <Send className="h-5 w-5" />
          <h3 className="text-xl font-semibold text-foreground">Réserver</h3>
        </div>

        <div>
          <Label htmlFor="name">Nom complet</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => checkLoyalty(e.target.value)}
          />
          {checkingLoyalty && (
            <p className="mt-1 text-xs text-muted-foreground">Vérification de votre fidélité…</p>
          )}
        </div>
        <div>
          <Label htmlFor="message">Message (optionnel)</Label>
          <Textarea
            id="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nombre de bagages, infos spéciales…"
          />
        </div>


        <div>
          <Label className="text-sm">Mode de paiement</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`rounded-lg border p-3 text-sm font-medium transition ${
                paymentMethod === "cash"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              💵 Espèces
              <div className="text-xs font-normal text-muted-foreground">Payer au chauffeur</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`rounded-lg border p-3 text-sm font-medium transition ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              💳 Carte
              <div className="text-xs font-normal text-muted-foreground">Paiement sécurisé</div>
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !route || !datetime}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : paymentMethod === "card" && !loyaltyFree && price && price > 0 ? (
            `Payer ${price.toFixed(2)} € par carte`
          ) : (
            "Envoyer la réservation"
          )}
        </Button>

        {(!route || !datetime) && (
          <p className="text-center text-xs text-muted-foreground">
            Calculez votre trajet et choisissez une date pour activer la réservation.
          </p>
        )}
      </form>
    </div>
  );
}
