/**
 * Types de domaine partagés Comoov.
 *
 * Les noms de champs sont en `snake_case` pour correspondre directement aux
 * colonnes Postgres/Supabase. Chaque interface reflète une table décrite dans
 * CLAUDE.md.
 */

export type UUID = string;
/** Timestamp ISO 8601 (ex. « 2026-07-09T14:30:00Z ») */
export type Timestamp = string;

export interface LatLng {
  lat: number;
  lng: number;
}

/* ------------------------------------------------------------------ *
 * profiles
 * ------------------------------------------------------------------ */

export type Role = 'passager' | 'conducteur' | 'admin';

export interface Profile {
  id: UUID;
  full_name: string;
  /** Téléphone au format E.164, vérifié par OTP */
  phone: string;
  phone_verified: boolean;
  role: Role;
  /** Note moyenne sur 5, null tant qu'aucune note reçue */
  average_rating: number | null;
  /** Jeton Expo Push du dernier appareil connecté (notifications) */
  expo_push_token: string | null;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ *
 * driver_docs
 * ------------------------------------------------------------------ */

export type DriverDocType = 'permis' | 'carte_grise' | 'assurance';
export type DriverDocStatus = 'en_attente' | 'valide' | 'refuse';

export interface DriverDoc {
  id: UUID;
  driver_id: UUID;
  doc_type: DriverDocType;
  /** URL du fichier dans le stockage Supabase */
  file_url: string;
  status: DriverDocStatus;
  /** Motif de refus renseigné par un admin, le cas échéant */
  review_note: string | null;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ *
 * lines & stops
 * ------------------------------------------------------------------ */

export interface Line {
  id: UUID;
  /** ex. « Mairie–Gare » */
  name: string;
  is_active: boolean;
  created_at: Timestamp;
}

export interface Stop {
  id: UUID;
  line_id: UUID;
  name: string;
  lat: number;
  lng: number;
  /** Ordre de l'arrêt le long de la ligne (0-indexé) */
  order_index: number;
}

/* ------------------------------------------------------------------ *
 * driver_trips
 * ------------------------------------------------------------------ */

export type DriverTripStatus = 'hors_ligne' | 'en_ligne' | 'termine';

export interface DriverTrip {
  id: UUID;
  driver_id: UUID;
  line_id: UUID;
  /** Arrêt de départ déclaré par le conducteur */
  start_stop_id: UUID;
  /** Arrêt d'arrivée déclaré par le conducteur */
  end_stop_id: UUID;
  /** Heure de départ prévue */
  departure_at: Timestamp;
  status: DriverTripStatus;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ *
 * ride_requests
 * ------------------------------------------------------------------ */

export type RideRequestStatus =
  | 'en_attente' // créée, en attente d'un conducteur
  | 'proposee' // proposée à un conducteur (compte à rebours 15 s)
  | 'acceptee' // un conducteur a accepté → une course est créée
  | 'expiree' // aucun conducteur n'a accepté à temps
  | 'annulee'; // annulée par le passager

export interface RideRequest {
  id: UUID;
  passenger_id: UUID;
  line_id: UUID;
  /** Arrêt de montée du passager */
  pickup_stop_id: UUID;
  /** Arrêt de descente du passager */
  dropoff_stop_id: UUID;
  status: RideRequestStatus;
  /** Conducteur actuellement sollicité (proposition en cours) */
  proposed_driver_id: UUID | null;
  /** Expiration de la proposition en cours (15 s après l'envoi) */
  expires_at: Timestamp | null;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ *
 * ride_request_proposals — rotation du matching
 * ------------------------------------------------------------------ */

export type ProposalOutcome = 'en_cours' | 'acceptee' | 'refusee' | 'expiree';

/**
 * Une sollicitation d'un conducteur pour une demande donnée. La Edge Function
 * `match-ride` en crée une par conducteur sollicité ; un conducteur n'est
 * jamais sollicité deux fois pour la même demande.
 */
export interface RideRequestProposal {
  id: UUID;
  request_id: UUID;
  driver_id: UUID;
  outcome: ProposalOutcome;
  proposed_at: Timestamp;
  /** Fin de validité de la proposition (15 s après l'envoi) */
  expires_at: Timestamp;
  responded_at: Timestamp | null;
}

/* ------------------------------------------------------------------ *
 * rides — machine à états de la course
 * ------------------------------------------------------------------ */

export type RideStatus =
  | 'confirmee' // course créée, code de montée généré
  | 'conducteur_en_route' // le conducteur roule vers l'arrêt de montée
  | 'arrive_a_l_arret' // le conducteur est à l'arrêt
  | 'en_cours' // code vérifié, passager à bord
  | 'terminee' // course terminée à l'arrêt de descente
  | 'annulee'; // annulée — possible uniquement AVANT « en_cours »

export interface Ride {
  id: UUID;
  request_id: UUID;
  trip_id: UUID;
  passenger_id: UUID;
  driver_id: UUID;
  /** Code de montée à 3 chiffres, vérifié par le conducteur */
  boarding_code: string;
  status: RideStatus;
  /** Distance facturée (km), base du barème kilométrique */
  distance_km: number | null;
  confirmed_at: Timestamp;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  cancelled_at: Timestamp | null;
}

/**
 * Transitions autorisées de la machine à états d'une course.
 * Toute logique de mise à jour de statut doit passer par `canTransitionRide`.
 * Règle métier : l'annulation n'est possible qu'AVANT « en_cours » — une fois
 * le passager à bord, la course va jusqu'à « terminee ».
 */
export const RIDE_TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  confirmee: ['conducteur_en_route', 'annulee'],
  conducteur_en_route: ['arrive_a_l_arret', 'annulee'],
  arrive_a_l_arret: ['en_cours', 'annulee'],
  en_cours: ['terminee'],
  terminee: [],
  annulee: [],
};

export function canTransitionRide(from: RideStatus, to: RideStatus): boolean {
  return RIDE_TRANSITIONS[from].includes(to);
}

/* ------------------------------------------------------------------ *
 * payments
 * ------------------------------------------------------------------ */

export type PaymentStatus = 'en_attente' | 'paye' | 'echoue' | 'rembourse';

export interface Payment {
  id: UUID;
  ride_id: UUID;
  /** Montant total payé par le passager, en centimes d'euro */
  amount_cents: number;
  /** Commission Comoov, en centimes d'euro */
  commission_cents: number;
  status: PaymentStatus;
  /** Identifiant du PaymentIntent Stripe */
  stripe_payment_intent_id: string | null;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ *
 * ratings — notes croisées passager ↔ conducteur
 * ------------------------------------------------------------------ */

export interface Rating {
  id: UUID;
  ride_id: UUID;
  /** Auteur de la note */
  rater_id: UUID;
  /** Personne notée */
  ratee_id: UUID;
  /** Note de 1 à 5 */
  score: number;
  comment: string | null;
  created_at: Timestamp;
}
