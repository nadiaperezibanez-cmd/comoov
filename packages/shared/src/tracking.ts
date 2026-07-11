/**
 * Suivi temps réel d'une course — logique pure, sans I/O.
 *
 * Le mobile conducteur publie sa position GPS toutes les 3 s sur un canal
 * Supabase Realtime dédié à la course (broadcast, rien n'est persisté) ;
 * le mobile passager s'y abonne et affiche la voiture et l'ETA vers l'arrêt.
 *
 * Module autonome (aucun import) : consommé par l'app mobile, les Edge
 * Functions et les tests vitest.
 */

/** Cadence de publication de la position du conducteur (règle produit : 3 s). */
export const POSITION_INTERVAL_MS = 3_000;

/** Nom de l'événement broadcast portant la position. */
export const EVENT_POSITION = 'position';

/** Vitesse moyenne urbaine retenue quand le GPS ne fournit pas de vitesse. */
export const DEFAULT_URBAN_SPEED_KMH = 25;

/** Position publiée par le conducteur sur le canal de la course. */
export interface PositionPayload {
  lat: number;
  lng: number;
  /** Cap en degrés (0 = nord), null si l'appareil ne le fournit pas */
  heading: number | null;
  /** Vitesse en m/s fournie par le GPS, null si indisponible */
  speed_ms: number | null;
  /** Horodatage de la mesure (ISO 8601) */
  recorded_at: string;
}

/** Canal Realtime dédié à une course. */
export function rideChannelName(rideId: string): string {
  return `course:${rideId}`;
}

const RAYON_TERRE_KM = 6_371;

/** Distance à vol d'oiseau entre deux points GPS (formule de haversine), en km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const versRadians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = versRadians(b.lat - a.lat);
  const dLng = versRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(versRadians(a.lat)) * Math.cos(versRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}

/**
 * ETA en minutes entre la position de la voiture et l'arrêt.
 *
 * Utilise la vitesse GPS quand elle est exploitable (> 1 m/s, sinon la
 * voiture est à l'arrêt et la vitesse instantanée n'a pas de sens), sinon
 * une vitesse moyenne urbaine. Toujours au moins 1 minute : on n'affiche
 * jamais « 0 min » à un passager qui attend.
 */
export function estimateEtaMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  speedMs: number | null = null,
): number {
  const distanceKm = haversineKm(from, to);
  const vitesseKmh =
    speedMs !== null && speedMs > 1 ? speedMs * 3.6 : DEFAULT_URBAN_SPEED_KMH;
  return Math.max(1, Math.ceil((distanceKm / vitesseKmh) * 60));
}
