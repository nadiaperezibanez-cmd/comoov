-- =============================================================================
-- Comoov — code de montée dans une table dédiée
--
-- Le code à 3 chiffres quittait la table `rides` : les DEUX participants
-- pouvaient le lire via l'API, ce qui vidait la vérification de son sens
-- (un conducteur peu scrupuleux aurait pu démarrer une course sans passager).
--
-- Désormais :
-- - `ride_codes` n'est lisible QUE par le passager de la course, qui
--   l'affiche à l'écran et l'énonce de vive voix au conducteur ;
-- - le conducteur saisit le code, vérifié CÔTÉ SERVEUR par la Edge Function
--   `verify-boarding-code`, qui fait passer la course en « en_cours ».
-- =============================================================================

alter table public.rides
  drop column boarding_code;

create table public.ride_codes (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  -- Code à 3 chiffres, zéros de tête compris (« 042 »)
  code text not null check (code ~ '^[0-9]{3}$'),
  created_at timestamptz not null default now()
);

comment on table public.ride_codes is
  'Code de montée : lisible uniquement par le passager, vérifié côté serveur (verify-boarding-code)';

alter table public.ride_codes enable row level security;

create policy "codes de montée : lisibles par le passager de la course"
on public.ride_codes for select
to authenticated
using (
  exists (
    select 1 from public.rides r
    where r.id = ride_codes.ride_id
      and r.passenger_id = auth.uid()
  )
);

-- Aucune politique insert/update/delete : seules les Edge Functions
-- (service_role) créent et suppriment les codes.
