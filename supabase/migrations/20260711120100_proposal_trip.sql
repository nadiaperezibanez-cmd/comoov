-- =============================================================================
-- Comoov — la proposition retient le trajet concerné
--
-- match-ride choisit un TRAJET précis (pas seulement un conducteur) ; la
-- course créée à l'acceptation doit référencer ce même trajet. On le stocke
-- donc sur la proposition au lieu de le re-déduire à l'acceptation (un
-- conducteur pourrait avoir déclaré plusieurs trajets).
-- =============================================================================

alter table public.ride_request_proposals
  add column trip_id uuid not null references public.driver_trips (id);

comment on column public.ride_request_proposals.trip_id is
  'Trajet déclaré retenu par match-ride ; repris tel quel par accept-ride';
