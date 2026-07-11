/**
 * Edge Function `accept-ride` — le conducteur accepte une proposition.
 *
 * Appelée en POST avec { proposal_id } et le JWT du conducteur :
 * 1. vérifie que la proposition est bien adressée à l'appelant, encore
 *    « en_cours » et non expirée (15 s) ;
 * 2. crée la course (statut « confirmee ») sur le trajet retenu par
 *    match-ride et génère le code de montée à 3 chiffres, stocké dans
 *    `ride_codes` (lisible uniquement par le passager) ;
 * 3. marque la proposition « acceptee » et la demande « acceptee ».
 *
 * Écritures en service_role : la RLS interdit ces opérations aux clients.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateBoardingCode } from '../../../packages/shared/src/boarding.ts';

interface ProposalRow {
  id: string;
  request_id: string;
  driver_id: string;
  trip_id: string;
  outcome: string;
  expires_at: string;
}

interface RequestRow {
  id: string;
  passenger_id: string;
  status: string;
}

function reponse(corps: Record<string, unknown>, statutHttp = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statutHttp,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Source aléatoire cryptographique pour le code de montée. */
function aleatoireCrypto(): number {
  const tampon = new Uint32Array(1);
  crypto.getRandomValues(tampon);
  return tampon[0] / 2 ** 32;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reponse({ erreur: 'Méthode non autorisée' }, 405);
  }

  let proposalId: string | undefined;
  try {
    const corps = (await req.json()) as { proposal_id?: string };
    proposalId = corps.proposal_id;
  } catch {
    // corps absent ou invalide → géré ci-dessous
  }
  if (!proposalId) {
    return reponse({ erreur: 'proposal_id manquant' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // L'appelant, identifié par son JWT
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: utilisateur } = await supabase.auth.getUser(jwt);
  const conducteurId = utilisateur.user?.id;
  if (!conducteurId) {
    return reponse({ erreur: 'Authentification requise' }, 401);
  }

  // 1. La proposition
  const { data: proposition } = await supabase
    .from('ride_request_proposals')
    .select('id, request_id, driver_id, trip_id, outcome, expires_at')
    .eq('id', proposalId)
    .maybeSingle<ProposalRow>();

  if (!proposition) {
    return reponse({ erreur: 'Proposition introuvable' }, 404);
  }
  if (proposition.driver_id !== conducteurId) {
    return reponse({ erreur: 'Cette proposition ne t’est pas adressée' }, 403);
  }
  if (proposition.outcome !== 'en_cours') {
    return reponse({ erreur: 'Proposition déjà traitée' }, 409);
  }

  const maintenant = new Date();
  if (new Date(proposition.expires_at) <= maintenant) {
    await supabase
      .from('ride_request_proposals')
      .update({ outcome: 'expiree', responded_at: maintenant.toISOString() })
      .eq('id', proposition.id)
      .eq('outcome', 'en_cours');
    return reponse({ erreur: 'Proposition expirée (15 s dépassées)' }, 409);
  }

  // 2. La demande correspondante
  const { data: demande } = await supabase
    .from('ride_requests')
    .select('id, passenger_id, status')
    .eq('id', proposition.request_id)
    .maybeSingle<RequestRow>();

  if (!demande || demande.status !== 'proposee') {
    return reponse({ erreur: 'Demande plus disponible' }, 409);
  }

  // 3. La course et son code de montée
  const { data: course, error: erreurCourse } = await supabase
    .from('rides')
    .insert({
      request_id: demande.id,
      trip_id: proposition.trip_id,
      passenger_id: demande.passenger_id,
      driver_id: conducteurId,
    })
    .select('id')
    .single<{ id: string }>();

  if (erreurCourse || !course) {
    return reponse(
      { erreur: erreurCourse?.message ?? 'Création de course impossible' },
      500,
    );
  }

  const { error: erreurCode } = await supabase
    .from('ride_codes')
    .insert({ ride_id: course.id, code: generateBoardingCode(aleatoireCrypto) });
  if (erreurCode) {
    return reponse({ erreur: erreurCode.message }, 500);
  }

  // 4. Clore la proposition et la demande
  await supabase
    .from('ride_request_proposals')
    .update({ outcome: 'acceptee', responded_at: maintenant.toISOString() })
    .eq('id', proposition.id);
  await supabase
    .from('ride_requests')
    .update({ status: 'acceptee', expires_at: null })
    .eq('id', demande.id);

  // Le code n'est PAS renvoyé au conducteur : seul le passager le lit
  // (table ride_codes) et l'énonce de vive voix.
  return reponse({ statut: 'acceptee', ride_id: course.id }, 201);
});
