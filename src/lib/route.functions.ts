import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const routeSchema = z.object({
  origin: z.string().min(3).max(300),
  destination: z.string().min(3).max(300),
  waypoints: z.array(z.string().min(3).max(300)).max(8).optional(),
  roundTrip: z.boolean().optional(),
});

export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => routeSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const intermediates = (data.waypoints ?? [])
      .filter((w) => w && w.trim().length >= 3)
      .map((address) => ({ address }));

    const finalDestination = data.roundTrip ? data.origin : data.destination;
    // For round trip, push the original destination as an intermediate
    if (data.roundTrip) {
      intermediates.push({ address: data.destination });
    }

    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { address: data.origin },
        destination: { address: finalDestination },
        intermediates: intermediates.length ? intermediates : undefined,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "fr-FR",
        units: "METRIC",
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Routes API error [${res.status}]: ${JSON.stringify(json)}`);
    }
    const route = json.routes?.[0];
    if (!route) throw new Error("Aucun itinéraire trouvé.");

    const distanceMeters: number = route.distanceMeters ?? 0;
    const durationStr: string = route.duration ?? "0s";
    const durationSec = parseInt(durationStr.replace("s", ""), 10) || 0;

    return {
      distanceKm: distanceMeters / 1000,
      durationMin: durationSec / 60,
    };
  });

const reverseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reverseSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=fr&region=fr`,
      {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        },
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Geocoding error [${res.status}]: ${JSON.stringify(json)}`);
    }
    const address: string | undefined = json.results?.[0]?.formatted_address;
    if (!address) throw new Error("Adresse introuvable.");
    return { address };
  });
