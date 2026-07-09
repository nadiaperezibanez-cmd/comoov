# Supabase

Backend Comoov : Postgres, Auth (OTP SMS), Realtime et Edge Functions.

Ce dossier accueillera, à partir du **Sprint 1 / Prompt 2** :

```
supabase/
├── config.toml          # généré par `supabase init`
├── migrations/          # migrations SQL (schéma, RLS, seed)
└── functions/           # Edge Functions (ex. match-ride)
```

## Démarrage (à faire au Sprint 1)

```bash
# Installer la CLI Supabase : https://supabase.com/docs/guides/cli
supabase init          # crée config.toml
supabase link          # relie au projet Supabase distant
supabase db push       # applique les migrations
```

> **Règle projet** : toute évolution de schéma passe par un fichier dans
> `supabase/migrations/`. Ne jamais modifier le schéma « à la main » dans le
> dashboard sans migration correspondante.
