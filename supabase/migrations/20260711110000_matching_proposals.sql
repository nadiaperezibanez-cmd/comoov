-- =============================================================================
-- Comoov — support du matching (Edge Function match-ride)
--
-- 1. Jeton Expo Push sur les profils, pour notifier le conducteur sollicité
-- 2. Historique des propositions : indispensable à la rotation « conducteur
--    suivant » (un conducteur n'est jamais sollicité deux fois pour la même
--    demande) et à l'audit du matching
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Jeton push
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column expo_push_token text;

comment on column public.profiles.expo_push_token is
  'Jeton Expo Push du dernier appareil connecté (mis à jour par l''app)';

-- Chacun peut enregistrer le jeton de son propre appareil
-- (la politique « modifier son propre profil » limite déjà à id = auth.uid()).
grant update (expo_push_token) on table public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Propositions de matching
-- -----------------------------------------------------------------------------

create type public.proposal_outcome as enum (
  'en_cours', -- envoyée au conducteur, compte à rebours 15 s
  'acceptee', -- le conducteur a accepté → une course est créée
  'refusee',  -- le conducteur a refusé explicitement
  'expiree'   -- pas de réponse dans les 15 s
);

create table public.ride_request_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ride_requests (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  outcome public.proposal_outcome not null default 'en_cours',
  proposed_at timestamptz not null default now(),
  -- Fin de validité : 15 s après l'envoi (PROPOSAL_TTL_SECONDS côté code)
  expires_at timestamptz not null,
  responded_at timestamptz,
  -- Un conducteur n'est sollicité qu'une seule fois par demande
  unique (request_id, driver_id)
);

create index ride_request_proposals_request_idx
  on public.ride_request_proposals (request_id);
create index ride_request_proposals_driver_en_cours_idx
  on public.ride_request_proposals (driver_id)
  where outcome = 'en_cours';

comment on table public.ride_request_proposals is
  'Rotation du matching : une ligne par conducteur sollicité (Edge Function match-ride)';

-- -----------------------------------------------------------------------------
-- RLS : lecture par les intéressés, création par la Edge Function uniquement,
-- le conducteur ne peut que refuser (l'acceptation crée une course et passe
-- par une Edge Function en service_role)
-- -----------------------------------------------------------------------------

alter table public.ride_request_proposals enable row level security;

create policy "propositions : lire celles qui me concernent (admins : toutes)"
on public.ride_request_proposals for select
to authenticated
using (
  driver_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.ride_requests r
    where r.id = ride_request_proposals.request_id
      and r.passenger_id = auth.uid()
  )
);

create policy "propositions : le conducteur refuse la sienne"
on public.ride_request_proposals for update
to authenticated
using (driver_id = auth.uid() and outcome = 'en_cours')
with check (driver_id = auth.uid() and outcome = 'refusee');

-- Le conducteur ne peut toucher qu'au résultat et à l'horodatage de réponse
revoke update on table public.ride_request_proposals from authenticated;
grant update (outcome, responded_at)
  on table public.ride_request_proposals to authenticated;
