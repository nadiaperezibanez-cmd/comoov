/**
 * Logique de matching Comoov — pure et sans I/O.
 *
 * Utilisée par :
 * - la Edge Function `match-ride` (Deno) via un import relatif,
 * - les tests vitest de ce package.
 *
 * Ce module est volontairement autonome (aucun import) pour rester
 * compatible Deno et Node sans configuration particulière.
 */

/** Durée de validité d'une proposition envoyée à un conducteur (règle produit). */
export const PROPOSAL_TTL_SECONDS = 15;

/**
 * Trajet conducteur candidat, aplati pour le matching : les arrêts sont
 * représentés par leur `order_index` sur la ligne.
 */
export interface CandidateTrip {
  trip_id: string;
  driver_id: string;
  line_id: string;
  status: 'hors_ligne' | 'en_ligne' | 'termine';
  /** Heure de départ prévue (ISO 8601) */
  departure_at: string;
  /** order_index de l'arrêt de départ du conducteur */
  start_order: number;
  /** order_index de l'arrêt d'arrivée du conducteur */
  end_order: number;
  /** Note moyenne du conducteur (null si jamais noté) */
  driver_rating: number | null;
}

/** Trajet demandé par le passager, plus les conducteurs à écarter. */
export interface JourneyContext {
  line_id: string;
  passenger_id: string;
  /** order_index de l'arrêt de montée */
  pickup_order: number;
  /** order_index de l'arrêt de descente */
  dropoff_order: number;
  /** Conducteurs déjà sollicités pour cette demande (rotation) */
  excluded_driver_ids?: readonly string[];
}

/**
 * Le trajet déclaré du conducteur dessert-il le trajet du passager ?
 *
 * Règles :
 * - même ligne ;
 * - la montée ET la descente du passager sont sur le segment du conducteur ;
 * - dans le sens de circulation du conducteur (un conducteur qui va de
 *   l'arrêt 5 vers l'arrêt 0 ne peut pas prendre un passager allant de 1 à 3) ;
 * - détour nul : la montée peut coïncider avec le départ du conducteur et la
 *   descente avec son arrivée, mais jamais au-delà.
 */
export function tripServesJourney(trip: CandidateTrip, journey: JourneyContext): boolean {
  if (trip.line_id !== journey.line_id) {
    return false;
  }

  const s = trip.start_order;
  const e = trip.end_order;
  const p = journey.pickup_order;
  const d = journey.dropoff_order;

  if (s < e) {
    // Sens « aller » : les ordres croissent
    return s <= p && p < d && d <= e;
  }
  if (s > e) {
    // Sens « retour » : les ordres décroissent
    return s >= p && p > d && d >= e;
  }
  return false;
}

/**
 * Compare deux candidats éligibles : le « mieux placé » d'abord.
 *
 * Sans position GPS temps réel (Sprint 4), le mieux placé est celui dont le
 * départ déclaré est le plus proche de l'arrêt de montée (en nombre d'arrêts).
 * Égalités départagées par la note moyenne (meilleure d'abord, jamais noté en
 * dernier), puis l'heure de départ la plus proche, puis l'id du trajet pour
 * rester déterministe.
 */
function compareCandidates(
  a: CandidateTrip,
  b: CandidateTrip,
  pickupOrder: number,
): number {
  const distanceA = Math.abs(a.start_order - pickupOrder);
  const distanceB = Math.abs(b.start_order - pickupOrder);
  if (distanceA !== distanceB) {
    return distanceA - distanceB;
  }

  const ratingA = a.driver_rating ?? -1;
  const ratingB = b.driver_rating ?? -1;
  if (ratingA !== ratingB) {
    return ratingB - ratingA;
  }

  const departureA = Date.parse(a.departure_at);
  const departureB = Date.parse(b.departure_at);
  if (departureA !== departureB) {
    return departureA - departureB;
  }

  return a.trip_id < b.trip_id ? -1 : a.trip_id > b.trip_id ? 1 : 0;
}

/**
 * Filtre puis classe les trajets candidats pour une demande passager.
 * Ne retient que les conducteurs en ligne, différents du passager, non déjà
 * sollicités, et dont le trajet dessert la demande.
 */
export function rankCandidates(
  trips: readonly CandidateTrip[],
  journey: JourneyContext,
): CandidateTrip[] {
  const excluded = journey.excluded_driver_ids ?? [];
  return trips
    .filter((trip) => trip.status === 'en_ligne')
    .filter((trip) => trip.driver_id !== journey.passenger_id)
    .filter((trip) => !excluded.includes(trip.driver_id))
    .filter((trip) => tripServesJourney(trip, journey))
    .sort((a, b) => compareCandidates(a, b, journey.pickup_order));
}

/**
 * Prochain conducteur à solliciter pour cette demande, ou null si plus
 * aucun candidat (la demande passe alors en « expiree »).
 */
export function selectNextDriver(
  trips: readonly CandidateTrip[],
  journey: JourneyContext,
): CandidateTrip | null {
  return rankCandidates(trips, journey)[0] ?? null;
}
