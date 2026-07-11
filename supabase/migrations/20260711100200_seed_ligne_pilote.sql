-- =============================================================================
-- Comoov — seed : ligne pilote « Mairie–Gare » et ses 3 arrêts fixes
--
-- UUID fixes pour pouvoir référencer la ligne pilote depuis le code et les
-- tests. Les coordonnées sont des VALEURS PROVISOIRES en région parisienne :
-- à remplacer par les vrais arrêts de la ligne pilote avant la bêta.
-- =============================================================================

insert into public.lines (id, name, is_active)
values ('a1000000-0000-4000-8000-000000000001', 'Mairie–Gare', true)
on conflict (id) do nothing;

insert into public.stops (id, line_id, name, lat, lng, order_index)
values
  (
    'a1000000-0000-4000-8000-000000000101',
    'a1000000-0000-4000-8000-000000000001',
    'Mairie',
    48.8503,
    2.4512,
    0
  ),
  (
    'a1000000-0000-4000-8000-000000000102',
    'a1000000-0000-4000-8000-000000000001',
    'Place du Marché',
    48.8547,
    2.4618,
    1
  ),
  (
    'a1000000-0000-4000-8000-000000000103',
    'a1000000-0000-4000-8000-000000000001',
    'Gare',
    48.8591,
    2.4725,
    2
  )
on conflict (id) do nothing;
