-- =============================================================================
-- Comoov — schéma initial
-- Tables : profiles, driver_docs, lines, stops, driver_trips, ride_requests,
--          rides, payments, ratings
-- Les noms de colonnes correspondent aux types de packages/shared/src/types.ts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types énumérés (mêmes valeurs que les unions de chaînes de @comoov/shared)
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('passager', 'conducteur', 'admin');

create type public.driver_doc_type as enum ('permis', 'carte_grise', 'assurance');
create type public.driver_doc_status as enum ('en_attente', 'valide', 'refuse');

create type public.driver_trip_status as enum ('hors_ligne', 'en_ligne', 'termine');

create type public.ride_request_status as enum (
  'en_attente', -- créée, en attente d'un conducteur
  'proposee',   -- proposée à un conducteur (compte à rebours 15 s)
  'acceptee',   -- un conducteur a accepté → une course est créée
  'expiree',    -- aucun conducteur n'a accepté à temps
  'annulee'     -- annulée par le passager
);

create type public.ride_status as enum (
  'confirmee',
  'conducteur_en_route',
  'arrive_a_l_arret',
  'en_cours',
  'terminee',
  'annulee'
);

create type public.payment_status as enum ('en_attente', 'paye', 'echoue', 'rembourse');

-- -----------------------------------------------------------------------------
-- profiles — un profil par utilisateur auth (créé au premier login OTP)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  -- Téléphone au format E.164, vérifié par OTP
  phone text not null unique,
  phone_verified boolean not null default false,
  role public.user_role not null default 'passager',
  -- Note moyenne sur 5, null tant qu'aucune note reçue (mise à jour par trigger)
  average_rating numeric(3, 2) check (average_rating between 1 and 5),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Utilisateurs Comoov (passagers, conducteurs, admins)';

-- -----------------------------------------------------------------------------
-- driver_docs — documents obligatoires du conducteur, validés par un admin
-- -----------------------------------------------------------------------------

create table public.driver_docs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  doc_type public.driver_doc_type not null,
  -- Chemin du fichier dans le stockage Supabase
  file_url text not null,
  status public.driver_doc_status not null default 'en_attente',
  -- Motif de refus renseigné par un admin, le cas échéant
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index driver_docs_driver_id_idx on public.driver_docs (driver_id);

comment on table public.driver_docs is 'Permis, carte grise, assurance — validés au back-office';

-- -----------------------------------------------------------------------------
-- lines & stops — la ligne pilote et ses arrêts fixes
-- -----------------------------------------------------------------------------

create table public.lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.lines is 'Lignes Comoov (MVP : une seule ligne pilote)';

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.lines (id) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  -- Ordre de l'arrêt le long de la ligne (0-indexé)
  order_index integer not null,
  unique (line_id, order_index)
);

create index stops_line_id_idx on public.stops (line_id);

comment on table public.stops is 'Arrêts fixes — jamais de porte-à-porte';

-- -----------------------------------------------------------------------------
-- driver_trips — trajets déclarés par les conducteurs
-- -----------------------------------------------------------------------------

create table public.driver_trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  line_id uuid not null references public.lines (id),
  start_stop_id uuid not null references public.stops (id),
  end_stop_id uuid not null references public.stops (id),
  -- Heure de départ prévue
  departure_at timestamptz not null,
  status public.driver_trip_status not null default 'hors_ligne',
  created_at timestamptz not null default now(),
  check (start_stop_id <> end_stop_id)
);

create index driver_trips_driver_id_idx on public.driver_trips (driver_id);
-- Requête du matching : conducteurs en ligne sur une ligne donnée
create index driver_trips_matching_idx on public.driver_trips (line_id, status);

comment on table public.driver_trips is 'Trajets déclarés (arrêt départ → arrêt arrivée)';

-- -----------------------------------------------------------------------------
-- ride_requests — demandes passager, proposition avec expiration 15 s
-- -----------------------------------------------------------------------------

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  line_id uuid not null references public.lines (id),
  pickup_stop_id uuid not null references public.stops (id),
  dropoff_stop_id uuid not null references public.stops (id),
  status public.ride_request_status not null default 'en_attente',
  -- Conducteur actuellement sollicité (proposition en cours)
  proposed_driver_id uuid references public.profiles (id) on delete set null,
  -- Expiration de la proposition en cours (15 s après l'envoi)
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (pickup_stop_id <> dropoff_stop_id)
);

create index ride_requests_passenger_id_idx on public.ride_requests (passenger_id);
create index ride_requests_proposed_driver_idx on public.ride_requests (proposed_driver_id)
  where status = 'proposee';

comment on table public.ride_requests is 'Demandes passager (expiration de proposition : 15 s)';

-- -----------------------------------------------------------------------------
-- rides — courses confirmées, machine à états
-- -----------------------------------------------------------------------------

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.ride_requests (id),
  trip_id uuid not null references public.driver_trips (id),
  passenger_id uuid not null references public.profiles (id),
  driver_id uuid not null references public.profiles (id),
  -- Code de montée à 3 chiffres, vérifié par le conducteur
  boarding_code text not null check (boarding_code ~ '^[0-9]{3}$'),
  status public.ride_status not null default 'confirmee',
  -- Distance facturée (km), base du barème kilométrique
  distance_km numeric(6, 2) check (distance_km > 0),
  confirmed_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (passenger_id <> driver_id)
);

create index rides_passenger_id_idx on public.rides (passenger_id);
create index rides_driver_id_idx on public.rides (driver_id);
create index rides_trip_id_idx on public.rides (trip_id);

comment on table public.rides is
  'Courses : confirmee → conducteur_en_route → arrive_a_l_arret → en_cours → terminee '
  '(annulee possible uniquement avant en_cours)';

-- Machine à états : mêmes transitions que RIDE_TRANSITIONS dans @comoov/shared.
-- Le trigger garantit la règle même en cas d'accès SQL direct, et horodate
-- automatiquement les changements d'état.
create function public.check_ride_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if not (
    (old.status = 'confirmee' and new.status in ('conducteur_en_route', 'annulee'))
    or (old.status = 'conducteur_en_route' and new.status in ('arrive_a_l_arret', 'annulee'))
    or (old.status = 'arrive_a_l_arret' and new.status in ('en_cours', 'annulee'))
    or (old.status = 'en_cours' and new.status = 'terminee')
  ) then
    raise exception 'transition de course invalide : % → %', old.status, new.status;
  end if;

  if new.status = 'en_cours' and new.started_at is null then
    new.started_at := now();
  elsif new.status = 'terminee' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status = 'annulee' and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger rides_check_transition
before update of status on public.rides
for each row
execute function public.check_ride_transition();

-- -----------------------------------------------------------------------------
-- payments — paiements Stripe (écrits uniquement par les Edge Functions)
-- -----------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides (id),
  -- Montants en centimes d'euro
  amount_cents integer not null check (amount_cents > 0),
  commission_cents integer not null check (commission_cents >= 0),
  status public.payment_status not null default 'en_attente',
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  -- La commission ne peut pas dépasser le montant payé
  check (commission_cents <= amount_cents)
);

comment on table public.payments is 'Paiements Stripe — la contrepartie conducteur reste plafonnée au barème kilométrique';

-- -----------------------------------------------------------------------------
-- ratings — notes croisées passager ↔ conducteur
-- -----------------------------------------------------------------------------

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  -- Auteur de la note
  rater_id uuid not null references public.profiles (id) on delete cascade,
  -- Personne notée
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- Une seule note par personne et par course
  unique (ride_id, rater_id),
  check (rater_id <> ratee_id)
);

create index ratings_ratee_id_idx on public.ratings (ratee_id);

comment on table public.ratings is 'Notes croisées après une course terminée';

-- Recalcule la note moyenne du profil noté après chaque nouvelle note.
-- SECURITY DEFINER : le trigger doit pouvoir mettre à jour le profil d'autrui,
-- ce que la RLS interdit à l'utilisateur qui note.
create function public.refresh_average_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set average_rating = (
    select round(avg(score)::numeric, 2)
    from public.ratings
    where ratee_id = new.ratee_id
  )
  where id = new.ratee_id;
  return new;
end;
$$;

create trigger ratings_refresh_average
after insert on public.ratings
for each row
execute function public.refresh_average_rating();
