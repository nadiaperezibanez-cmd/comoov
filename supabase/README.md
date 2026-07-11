# Supabase

Backend Comoov : Postgres, Auth (OTP SMS), Realtime et Edge Functions.

```
supabase/
├── migrations/          # migrations SQL (schéma, RLS, seed) — source de vérité
└── functions/           # Edge Functions (ex. match-ride) — à partir du Sprint 3
```

## Migrations

| Fichier | Contenu |
|---|---|
| `20260711100000_schema_initial.sql` | Les 9 tables (`profiles`, `driver_docs`, `lines`, `stops`, `driver_trips`, `ride_requests`, `rides`, `payments`, `ratings`), les enums de statuts, le trigger de la machine à états des courses et le recalcul de la note moyenne |
| `20260711100100_rls.sql` | RLS sur toutes les tables : chacun ne lit que ses données, les admins lisent tout ; protection des colonnes sensibles (`role`, `phone_verified`, `average_rating`) |
| `20260711100200_seed_ligne_pilote.sql` | Ligne pilote « Mairie–Gare » et ses 3 arrêts fixes (coordonnées provisoires, à remplacer par les vrais arrêts) |

Principes :

- **Toute évolution de schéma passe par une migration.** Ne jamais modifier le
  schéma « à la main » dans le dashboard.
- Les écritures sensibles (création de course, attribution du matching,
  paiements, validation de documents) passent par les **Edge Functions**
  (`service_role`), pas par les clients.
- La machine à états des courses est **doublement garantie** : côté TypeScript
  (`canTransitionRide` dans `@comoov/shared`) et côté base (trigger
  `rides_check_transition`).

## Appliquer les migrations

```bash
# Installer la CLI Supabase : https://supabase.com/docs/guides/cli
supabase init          # crée config.toml (une seule fois)
supabase link          # relie au projet Supabase distant
supabase db push       # applique les migrations
```

En local (`supabase start`, nécessite Docker), les migrations sont appliquées
automatiquement à chaque `supabase db reset`.
