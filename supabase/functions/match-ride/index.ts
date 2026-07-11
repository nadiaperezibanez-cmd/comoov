/**
 * Edge Function `match-ride` — le cœur du matching Comoov.
 *
 * Appelée avec { request_id } :
 * - à la création d'une demande passager (premier appel),
 * - au refus du conducteur sollicité ou à l'expiration des 15 s (rappels).
 *
 * À chaque appel, la fonction est idempotente :
 * 1. si une proposition est encore valide → ne fait rien ;
 * 2. sinon, marque la proposition dépassée comme « expiree » ;
 * 3. choisit le conducteur suivant le mieux placé (logique pure de
 *    @comoov/shared, testée par vitest) en excluant les déjà sollicités ;
 * 4. enregistre la proposition (expiration 15 s) et notifie le conducteur
 *    via Expo Push ;
 * 5. s'il n'y a plus de candidat, passe la demande en « expiree ».
 *
 * Écritures en service_role : la RLS réserve ces opérations au serveur.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  PROPOSAL_TTL_SECONDS,
  selectNextDriver,
  type CandidateTrip,
} from '../../../packages/shared/src/matching.ts';

interface RideRequestRow {
  id: string;
  passenger_id: string;
  line_id: string;
  pickup_stop_id: string;
  dropoff_stop_id: string;
  status: string;
  expires_at: string | null;
}

interface StopRow {
  id: string;
  order_index: number;
}

interface TripRow {
  id: string;
  driver_id: string;
  line_id: string;
  status: 'hors_ligne' | 'en_ligne' | 'termine';
  departure_at: string;
  start_stop: { order_index: number } | null;
  end_stop: { order_index: number } | null;
  driver: { average_rating: number | null; expo_push_token: string | null } | null;
}

function reponse(corps: Record<string, unknown>, statutHttp = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statutHttp,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function notifierConducteur(pushToken: string, requestId: string): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: 'Nouvelle demande Comoov',
        body: `Un passager t'attend à un arrêt de ta ligne — réponds dans les ${PROPOSAL_TTL_SECONDS} secondes.`,
        data: { type: 'ride_request_proposal', request_id: requestId },
        priority: 'high',
      }),
    });
  } catch (erreur) {
    // La notification est best effort : le matching ne doit pas échouer
    // parce qu'un push n'est pas parti (l'app conducteur voit aussi la
    // proposition via Realtime/refresh).
    console.error('Échec de la notification push', erreur);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reponse({ erreur: 'Méthode non autorisée' }, 405);
  }

  let requestId: string | undefined;
  try {
    const corps = (await req.json()) as { request_id?: string };
    requestId = corps.request_id;
  } catch {
    // corps absent ou invalide → géré ci-dessous
  }
  if (!requestId) {
    return reponse({ erreur: 'request_id manquant' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 1. La demande
  const { data: demande, error: erreurDemande } = await supabase
    .from('ride_requests')
    .select(
      'id, passenger_id, line_id, pickup_stop_id, dropoff_stop_id, status, expires_at',
    )
    .eq('id', requestId)
    .maybeSingle<RideRequestRow>();

  if (erreurDemande) {
    return reponse({ erreur: erreurDemande.message }, 500);
  }
  if (!demande) {
    return reponse({ erreur: 'Demande introuvable' }, 404);
  }
  if (demande.status !== 'en_attente' && demande.status !== 'proposee') {
    return reponse({ statut: demande.status, message: 'Demande déjà traitée' }, 409);
  }

  const maintenant = new Date();

  // 2. Une proposition encore valide ? Ne rien faire (idempotence).
  if (
    demande.status === 'proposee' &&
    demande.expires_at !== null &&
    new Date(demande.expires_at) > maintenant
  ) {
    return reponse({ statut: 'proposition_en_cours', expires_at: demande.expires_at });
  }

  // 3. Marquer la proposition dépassée comme expirée
  if (demande.status === 'proposee') {
    await supabase
      .from('ride_request_proposals')
      .update({ outcome: 'expiree', responded_at: maintenant.toISOString() })
      .eq('request_id', demande.id)
      .eq('outcome', 'en_cours');
  }

  // 4. Ordres des arrêts de montée et de descente
  const { data: arrets } = await supabase
    .from('stops')
    .select('id, order_index')
    .in('id', [demande.pickup_stop_id, demande.dropoff_stop_id])
    .returns<StopRow[]>();

  const ordreMontee = arrets?.find((a) => a.id === demande.pickup_stop_id)?.order_index;
  const ordreDescente = arrets?.find(
    (a) => a.id === demande.dropoff_stop_id,
  )?.order_index;
  if (ordreMontee === undefined || ordreDescente === undefined) {
    return reponse({ erreur: 'Arrêts de la demande introuvables' }, 500);
  }

  // 5. Conducteurs déjà sollicités pour cette demande (rotation)
  const { data: dejaSollicites } = await supabase
    .from('ride_request_proposals')
    .select('driver_id')
    .eq('request_id', demande.id)
    .returns<{ driver_id: string }[]>();

  // 6. Trajets en ligne sur la même ligne
  const { data: trajets, error: erreurTrajets } = await supabase
    .from('driver_trips')
    .select(
      `id, driver_id, line_id, status, departure_at,
       start_stop:stops!driver_trips_start_stop_id_fkey (order_index),
       end_stop:stops!driver_trips_end_stop_id_fkey (order_index),
       driver:profiles!driver_trips_driver_id_fkey (average_rating, expo_push_token)`,
    )
    .eq('line_id', demande.line_id)
    .eq('status', 'en_ligne')
    .returns<TripRow[]>();

  if (erreurTrajets) {
    return reponse({ erreur: erreurTrajets.message }, 500);
  }

  const candidats: CandidateTrip[] = (trajets ?? [])
    .filter((t) => t.start_stop !== null && t.end_stop !== null)
    .map((t) => ({
      trip_id: t.id,
      driver_id: t.driver_id,
      line_id: t.line_id,
      status: t.status,
      departure_at: t.departure_at,
      start_order: (t.start_stop as { order_index: number }).order_index,
      end_order: (t.end_stop as { order_index: number }).order_index,
      driver_rating: t.driver?.average_rating ?? null,
    }));

  const suivant = selectNextDriver(candidats, {
    line_id: demande.line_id,
    passenger_id: demande.passenger_id,
    pickup_order: ordreMontee,
    dropoff_order: ordreDescente,
    excluded_driver_ids: (dejaSollicites ?? []).map((p) => p.driver_id),
  });

  // 7. Plus aucun candidat → la demande expire
  if (suivant === null) {
    await supabase
      .from('ride_requests')
      .update({ status: 'expiree', proposed_driver_id: null, expires_at: null })
      .eq('id', demande.id);
    return reponse({ statut: 'aucun_conducteur' });
  }

  // 8. Enregistrer la proposition et solliciter le conducteur
  const expireA = new Date(
    maintenant.getTime() + PROPOSAL_TTL_SECONDS * 1000,
  ).toISOString();

  const { error: erreurProposition } = await supabase
    .from('ride_request_proposals')
    .insert({
      request_id: demande.id,
      driver_id: suivant.driver_id,
      trip_id: suivant.trip_id,
      expires_at: expireA,
    });
  if (erreurProposition) {
    return reponse({ erreur: erreurProposition.message }, 500);
  }

  await supabase
    .from('ride_requests')
    .update({
      status: 'proposee',
      proposed_driver_id: suivant.driver_id,
      expires_at: expireA,
    })
    .eq('id', demande.id);

  const jetonPush = (trajets ?? []).find((t) => t.driver_id === suivant.driver_id)?.driver
    ?.expo_push_token;
  if (jetonPush) {
    await notifierConducteur(jetonPush, demande.id);
  }

  return reponse({
    statut: 'proposee',
    driver_id: suivant.driver_id,
    trip_id: suivant.trip_id,
    expires_at: expireA,
  });
});
