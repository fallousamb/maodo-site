import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getPublicTracking } from "@/lib/tracking.functions";
import { Loader2, MapPin, Phone, Car } from "lucide-react";

export const Route = createFileRoute("/suivi/$token")({
  component: SuiviPage,
  head: () => ({ meta: [{ title: "Suivi de votre chauffeur" }] }),
});

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

let mapsLoader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    (window as any).__suiviInit = () => resolve();
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__suiviInit${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.onerror = () => reject(new Error("Maps load failed"));
    document.head.appendChild(s);
  });
  return mapsLoader;
}

function SuiviPage() {
  const { token } = Route.useParams();
  const fetcher = useServerFn(getPublicTracking);
  const trackingQ = useQuery({
    queryKey: ["public-tracking", token],
    queryFn: () => fetcher({ data: { token } }),
    refetchInterval: 5000,
    retry: false,
  });

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadMaps()
      .then(() => {
        if (!mapDivRef.current) return;
        mapRef.current = new (window as any).google.maps.Map(mapDivRef.current, {
          center: { lat: 45.94, lng: -0.96 },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
        });
        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapReady || !trackingQ.data?.position || !mapRef.current) return;
    const pos = trackingQ.data.position;
    const g = (window as any).google;
    const latLng = new g.maps.LatLng(pos.lat, pos.lng);
    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        position: latLng,
        map: mapRef.current,
        title: "Chauffeur",
      });
    } else {
      markerRef.current.setPosition(latLng);
    }
    mapRef.current.panTo(latLng);
  }, [mapReady, trackingQ.data?.position?.lat, trackingQ.data?.position?.lng]);

  if (trackingQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (trackingQ.isError) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Lien invalide</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien de suivi n'existe pas ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  const r = trackingQ.data!.reservation;
  const d = trackingQ.data!.driver;
  const p = trackingQ.data!.position;
  const isMoving = p && p.speed != null && p.speed > 1;
  const lastUpdate = p ? new Date(p.recorded_at) : null;
  const stale = lastUpdate ? Date.now() - lastUpdate.getTime() > 30000 : false;
  const statusLabel =
    r.status === "completed"
      ? "Course terminée"
      : r.status === "in_progress"
        ? stale
          ? "Chauffeur connecté — dernière position ancienne"
          : isMoving
            ? "Chauffeur en mouvement"
            : "Chauffeur à l'arrêt"
        : "En attente du démarrage de la course";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-base font-semibold">Bonjour {r.customer_name}</h1>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div
          ref={mapDivRef}
          className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted"
        />

        {!BROWSER_KEY && (
          <p className="text-xs text-destructive">
            Carte indisponible (clé Google Maps non configurée).
          </p>
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm shadow-soft">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <div>
                <span className="text-muted-foreground">Départ : </span>
                {r.pickup_address}
              </div>
              <div>
                <span className="text-muted-foreground">Arrivée : </span>
                {r.dropoff_address}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Prise en charge :{" "}
                {new Date(r.pickup_datetime).toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </div>
            </div>
          </div>
        </div>

        {d && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm shadow-soft">
            <div className="font-semibold">Votre chauffeur : {d.full_name}</div>
            {d.vehicle && (
              <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                <Car className="h-4 w-4" />
                {d.vehicle}
              </div>
            )}
            <a
              href={`tel:${d.phone}`}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground"
            >
              <Phone className="h-4 w-4" /> Appeler le chauffeur
            </a>
          </div>
        )}

        {p && (
          <p className="text-center text-xs text-muted-foreground">
            Dernière position : {lastUpdate!.toLocaleTimeString("fr-FR")}
          </p>
        )}
      </div>
    </div>
  );
}
