/**
 * Edge Function `verify-boarding-code` — vérification du code de montée.
 *
 * Le passager énonce son code de vive voix ; le conducteur le saisit et
 * l'app appelle cette fonction en POST avec { ride_id, code } et le JWT du
 * conducteur :
 * 1. l'appelant doit être le conducteur de la course ;
 * 2. la course doit être « arrive_a_l_arret » (on ne vérifie pas un code
 *    avant d'être à l'arrêt) ;
 * 3. le code est comparé CÔTÉ SERVEUR à `ride_codes` (le conducteur n'y a
 *    pas accès en lecture) ;
 * 4. si le code correspond, la course passe en « en_cours » — le trigger
 *    de la machine à états horodate le départ.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { boardingCodesMatch } from '../../../packages/shared/src/boarding.ts';

interface RideRow {
  id: string;
  driver_id: string;
  status: string;
}

function reponse(corps: Record<string, unknown>, statutHttp = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statutHttp,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reponse({ erreur: 'Méthode non autorisée' }, 405);
  }

  let rideId: string | undefined;
  let code: string | undefined;
  try {
    const corps = (await req.json()) as { ride_id?: string; code?: string };
    rideId = corps.ride_id;
    code = corps.code;
  } catch {
    // corps absent ou invalide → géré ci-dessous
  }
  if (!rideId || code === undefined) {
    return reponse({ erreur: 'ride_id ou code manquant' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: utilisateur } = await supabase.auth.getUser(jwt);
  const appelantId = utilisateur.user?.id;
  if (!appelantId) {
    return reponse({ erreur: 'Authentification requise' }, 401);
  }

  // 1. La course
  const { data: course } = await supabase
    .from('rides')
    .select('id, driver_id, status')
    .eq('id', rideId)
    .maybeSingle<RideRow>();

  if (!course) {
    return reponse({ erreur: 'Course introuvable' }, 404);
  }
  if (course.driver_id !== appelantId) {
    return reponse(
      { erreur: 'Seul le conducteur de la course peut vérifier le code' },
      403,
    );
  }
  if (course.status !== 'arrive_a_l_arret') {
    return reponse(
      {
        erreur:
          'Le code se vérifie à l’arrêt, une fois la course en « arrive_a_l_arret »',
      },
      409,
    );
  }

  // 2. Comparaison côté serveur
  const { data: codeAttendu } = await supabase
    .from('ride_codes')
    .select('code')
    .eq('ride_id', course.id)
    .maybeSingle<{ code: string }>();

  if (!codeAttendu) {
    return reponse({ erreur: 'Code de montée introuvable pour cette course' }, 500);
  }
  if (!boardingCodesMatch(codeAttendu.code, code)) {
    return reponse({ ok: false, erreur: 'Code incorrect' }, 403);
  }

  // 3. Passager à bord : la course démarre
  const { error: erreurTransition } = await supabase
    .from('rides')
    .update({ status: 'en_cours' })
    .eq('id', course.id);
  if (erreurTransition) {
    return reponse({ erreur: erreurTransition.message }, 500);
  }

  return reponse({ ok: true, statut: 'en_cours' });
});
