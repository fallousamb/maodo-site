// Pricing logic — kept server-mirrored so estimates and stored prices match.
// Detailed breakdown is intentionally NOT exposed to the UI.

export const MIN_PRICE = 15;

// Codes promo : gérés en base (table promo_codes), usage unique, générés depuis l'admin.
// Conservé pour rétro-compat des appels existants, mais aucun code statique n'est valide.
export const PROMO_CODES: Record<string, number> = {};

// Fidélité : la 11ème course (puis 22ème, 33ème…) est offerte
export const LOYALTY_THRESHOLD = 10;
export function isLoyaltyFreeRide(previousCount: number): boolean {
  // previousCount = nombre de réservations DÉJÀ effectuées par le client
  // → la prochaine est la (previousCount + 1)ème
  const nextIndex = previousCount + 1;
  return nextIndex > 0 && nextIndex % (LOYALTY_THRESHOLD + 1) === 0;
}

export function computeBasePrice(args: {
  distanceKm: number;
  waitMin: number;
  pickupDate: Date;
}): number {
  const { distanceKm, waitMin, pickupDate } = args;

  const base = 4;

  // Degressive km: 2€/km up to 40km, then 1.50€/km above
  let kmCost: number;
  if (distanceKm <= 40) {
    kmCost = distanceKm * 2;
  } else {
    kmCost = 40 * 2 + (distanceKm - 40) * 1.5;
  }

  const waitCost = waitMin * 0.5;

  let total = base + kmCost + waitCost;

  // Surcharge: Sunday OR 21:30-07:59 → +10%
  const day = pickupDate.getDay();
  const hour = pickupDate.getHours();
  const minute = pickupDate.getMinutes();
  const timeVal = hour * 60 + minute;
  const isNight = timeVal >= 21 * 60 + 30 || timeVal < 8 * 60;
  if (day === 0 || isNight) {
    total *= 1.1;
  }

  return Math.max(total, MIN_PRICE);
}

export function computePrice(args: {
  distanceKm: number;
  waitMin: number;
  pickupDate: Date;
  promoCode?: string | null;
  loyaltyFree?: boolean;
}): number {
  if (args.loyaltyFree) return 0;

  const base = computeBasePrice(args);
  const code = (args.promoCode || "").trim().toUpperCase();
  const discount = code && PROMO_CODES[code] ? PROMO_CODES[code] : 0;
  const total = base * (1 - discount);
  // Le minimum de course ne s'applique pas si un promo le fait descendre,
  // mais on garde au moins 0.
  return Math.max(total, 0);
}
