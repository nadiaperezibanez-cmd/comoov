-- =============================================================================
-- Comoov — politiques RLS
-- Principe : un utilisateur ne lit que ses propres données, les admins lisent
-- tout. Les écritures sensibles (courses, paiements, validation de documents)
-- passent par les Edge Functions (service_role), qui contournent la RLS.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.driver_docs enable row level security;
alter table public.lines enable row level security;
alter table public.stops enable row level security;
alter table public.driver_trips enable row level security;
alter table public.ride_requests enable row level security;
alter table public.rides enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;

-- -----------------------------------------------------------------------------
-- Helper : l'utilisateur courant est-il admin ?
-- SECURITY DEFINER pour lire profiles sans déclencher la RLS (évite la
-- récursion des politiques de profiles sur elles-mêmes).
-- -----------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create policy "profils : lire son propre profil (admins : tous)"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

-- Les participants d'une même course voient le profil l'un de l'autre
-- (nom et note du conducteur côté passager, et inversement).
create policy "profils : lire le profil de son co-trajet"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.rides r
    where (r.passenger_id = auth.uid() and r.driver_id = profiles.id)
       or (r.driver_id = auth.uid() and r.passenger_id = profiles.id)
  )
);

create policy "profils : créer son propre profil"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profils : modifier son propre profil"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Personne ne modifie lui-même son rôle, sa note ou son statut de vérification :
-- seuls le nom (utilisateur) et les champs gérés côté serveur évoluent.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- driver_docs
-- -----------------------------------------------------------------------------

create policy "documents : lire les siens (admins : tous)"
on public.driver_docs for select
to authenticated
using (driver_id = auth.uid() or public.is_admin());

create policy "documents : déposer les siens (en attente)"
on public.driver_docs for insert
to authenticated
with check (driver_id = auth.uid() and status = 'en_attente');

create policy "documents : supprimer les siens tant qu'en attente"
on public.driver_docs for delete
to authenticated
using (driver_id = auth.uid() and status = 'en_attente');

-- La validation/refus est réservée aux admins (back-office).
create policy "documents : validation par les admins"
on public.driver_docs for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- lines & stops — référentiel public de la ligne pilote
-- -----------------------------------------------------------------------------

create policy "lignes : lisibles par tous les connectés"
on public.lines for select
to authenticated
using (true);

create policy "lignes : gérées par les admins"
on public.lines for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "arrêts : lisibles par tous les connectés"
on public.stops for select
to authenticated
using (true);

create policy "arrêts : gérés par les admins"
on public.stops for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- driver_trips
-- -----------------------------------------------------------------------------

create policy "trajets : lire les siens (admins : tous)"
on public.driver_trips for select
to authenticated
using (driver_id = auth.uid() or public.is_admin());

create policy "trajets : déclarer les siens"
on public.driver_trips for insert
to authenticated
with check (driver_id = auth.uid());

create policy "trajets : modifier les siens"
on public.driver_trips for update
to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

create policy "trajets : supprimer les siens"
on public.driver_trips for delete
to authenticated
using (driver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- ride_requests
-- Le passager crée et annule ; le conducteur sollicité voit la proposition.
-- L'attribution (proposee/acceptee/expiree) est pilotée par la Edge Function
-- de matching (service_role).
-- -----------------------------------------------------------------------------

create policy "demandes : lire les siennes ou celles qui me sont proposées"
on public.ride_requests for select
to authenticated
using (
  passenger_id = auth.uid()
  or proposed_driver_id = auth.uid()
  or public.is_admin()
);

create policy "demandes : créer les siennes"
on public.ride_requests for insert
to authenticated
with check (passenger_id = auth.uid());

create policy "demandes : modifier les siennes"
on public.ride_requests for update
to authenticated
using (passenger_id = auth.uid())
with check (passenger_id = auth.uid());

-- -----------------------------------------------------------------------------
-- rides
-- Création par la Edge Function de matching uniquement (service_role) ;
-- les participants suivent et font avancer la machine à états (le trigger
-- rides_check_transition garantit les transitions valides).
-- -----------------------------------------------------------------------------

create policy "courses : lire les siennes (admins : toutes)"
on public.rides for select
to authenticated
using (
  passenger_id = auth.uid()
  or driver_id = auth.uid()
  or public.is_admin()
);

create policy "courses : mise à jour par les participants"
on public.rides for update
to authenticated
using (passenger_id = auth.uid() or driver_id = auth.uid())
with check (passenger_id = auth.uid() or driver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- payments — lecture seule pour les participants ; écritures via Edge Functions
-- -----------------------------------------------------------------------------

create policy "paiements : lire ceux de ses courses (admins : tous)"
on public.payments for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.rides r
    where r.id = payments.ride_id
      and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- ratings
-- On ne note qu'une course terminée à laquelle on a participé, et on note
-- l'autre participant.
-- -----------------------------------------------------------------------------

create policy "notes : lire celles qui me concernent (admins : toutes)"
on public.ratings for select
to authenticated
using (rater_id = auth.uid() or ratee_id = auth.uid() or public.is_admin());

create policy "notes : noter l'autre participant d'une course terminée"
on public.ratings for insert
to authenticated
with check (
  rater_id = auth.uid()
  and exists (
    select 1 from public.rides r
    where r.id = ratings.ride_id
      and r.status = 'terminee'
      and (
        (r.passenger_id = auth.uid() and r.driver_id = ratings.ratee_id)
        or (r.driver_id = auth.uid() and r.passenger_id = ratings.ratee_id)
      )
  )
);
