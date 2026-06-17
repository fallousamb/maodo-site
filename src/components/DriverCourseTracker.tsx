import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, MapPin, Square } from "lucide-react";
import {
  startCourse,
  pushDriverPosition,
  getMyTrackingToken,
} from "@/lib/tracking.functions";

type Props = { reservationId: string; completed: boolean };

export function DriverCourseTracker({ reservationId, completed }: Props) {
  const qc = useQueryClient();
  const start = useServerFn(startCourse);
  const push = useServerFn(pushDriverPosition);
  const getToken = useServerFn(getMyTrackingToken);

  const [active, setActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const tokenQ = useQuery({
    queryKey: ["tracking-token", reservationId],
    queryFn: () => getToken({ data: { reservation_id: reservationId } }),
  });

  const startM = useMutation({
    mutationFn: () => start({ data: { reservation_id: reservationId } }),
    onSuccess: async (res: any) => {
      qc.setQueryData(["tracking-token", reservationId], {
        tracking_token: res.tracking_token,
        status: "in_progress",
      });
      beginTracking();
      try {
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock?.request("screen");
      } catch {}
      toast.success("Course démarrée — suivi GPS actif");
    },
    onError: (e: any) => toast.error(e?.message ?? "Impossible de démarrer"),
  });

  function beginTracking() {
    if (!("geolocation" in navigator)) {
      toast.error("Géolocalisation indisponible sur cet appareil");
      return;
    }
    setActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        push({
          data: {
            reservation_id: reservationId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
          },
        }).catch(() => {});
      },
      (err) => {
        console.warn("geo error", err);
        toast.error(`GPS : ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
    );
  }

  function stopTracking() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setActive(false);
    try { wakeLockRef.current?.release?.(); } catch {}
    wakeLockRef.current = null;
  }

  useEffect(() => () => stopTracking(), []);

  // Auto-resume if already in_progress on mount
  useEffect(() => {
    if (
      !active &&
      tokenQ.data?.status === "in_progress" &&
      tokenQ.data?.tracking_token &&
      !completed
    ) {
      beginTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenQ.data?.status]);

  const token = tokenQ.data?.tracking_token ?? null;
  const trackingUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/suivi/${token}`
      : null;

  if (completed) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Suivi GPS de la course
        </div>
        {!token || tokenQ.data?.status !== "in_progress" ? (
          <Button
            size="sm"
            onClick={() => startM.mutate()}
            disabled={startM.isPending}
            className="gap-2"
          >
            {startM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Démarrer la course
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={stopTracking}
            disabled={!active}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            {active ? "Arrêter le partage" : "Partage arrêté"}
          </Button>
        )}
      </div>
      {trackingUrl && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Lien à transmettre au client (SMS / email) pour qu'il vous suive en temps réel :
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={trackingUrl}
              className="flex-1 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
            />
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => {
                navigator.clipboard.writeText(trackingUrl);
                toast.success("Lien copié");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copier
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {active
              ? "Position envoyée toutes les ~5 s. Gardez l'application ouverte."
              : "Le partage est arrêté — le client ne verra plus de mises à jour."}
          </p>
        </div>
      )}
    </div>
  );
}
