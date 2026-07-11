# Supabase

Backend Comoov : Postgres, Auth (OTP SMS), Realtime et Edge Functions.

```
supabase/
├── migrations/               # migrations SQL (schéma, RLS, seed) — source de vérité
└── functions/
    ├── match-ride/           # matching : propose la demande au conducteur suivant
    ├── accept-ride/          # le conducteur accepte → course + code de montée
    └── verify-boarding-code/ # vérifie le code côté serveur → course « en_cours »
```

## Migrations

| Fichier | Contenu |
|---|---|
| `20260711100000_schema_initial.sql` | Les 9 tables (`profiles`, `driver_docs`, `lines`, `stops`, `driver_trips`, `ride_requests`, `rides`, `payments`, `ratings`), les enums de statuts, le trigger de la machine à états des courses et le recalcul de la note moyenne |
| `20260711100100_rls.sql` | RLS sur toutes les tables : chacun ne lit que ses données, les admins lisent tout ; protection des colonnes sensibles (`role`, `phone_verified`, `average_rating`) |
| `20260711100200_seed_ligne_pilote.sql` | Ligne pilote « Mairie–Gare » et ses 3 arrêts fixes (coordonnées provisoires, à remplacer par les vrais arrêts) |
| `20260711110000_matching_proposals.sql` | Jeton Expo Push sur les profils + table `ride_request_proposals` (rotation du matching : un conducteur n'est sollicité qu'une fois par demande ; le conducteur peut refuser, l'acceptation passe par le serveur) |
| `20260711120000_ride_codes.sql` | Le code de montée quitte `rides` pour la table `ride_codes`, lisible **uniquement par le passager** — la vérification se fait côté serveur |
| `20260711120100_proposal_trip.sql` | La proposition retient le trajet précis choisi par match-ride (`trip_id`), repris par accept-ride |

Principes :

- **Toute évolution de schéma passe par une migration.** Ne jamais modifier le
  schéma « à la main » dans le dashboard.
- Les écritures sensibles (création de course, attribution du matching,
  paiements, validation de documents) passent par les **Edge Functions**
  (`service_role`), pas par les clients.
- La machine à états des courses est **doublement garantie** : côté TypeScript
  (`canTransitionRide` dans `@comoov/shared`) et côté base (trigger
  `rides_check_transition`).

## Edge Function `match-ride`

Le cœur du matching. Appelée en POST avec `{ "request_id": "<uuid>" }` :

1. **Idempotente** : si une proposition est encore valide (moins de 15 s),
   elle ne fait rien.
2. Marque la proposition dépassée comme `expiree`.
3. Choisit le **conducteur suivant le mieux placé** : conducteurs `en_ligne`
   sur la même ligne, dont le trajet déclaré passe par la montée ET la
   descente du passager dans le bon sens, jamais déjà sollicités pour cette
   demande. Classement : départ le plus proche de l'arrêt de montée, puis
   meilleure note, puis départ le plus tôt.
4. Enregistre la proposition (expiration 15 s) et notifie le conducteur via
   Expo Push (best effort).
5. Plus aucun candidat → la demande passe en `expiree`.

La logique de matching pure vit dans `packages/shared/src/matching.ts`
(importée par la fonction en relatif) et est couverte par les tests vitest
du package (`pnpm test`).

**Qui rappelle la fonction ?** Au MVP : l'app passager la ré-invoque quand le
compte à rebours expire, et le refus du conducteur déclenche aussi un rappel
(câblage côté mobile au Sprint 3/4). Une tâche `pg_cron` pourra fiabiliser ça
plus tard.

```bash
supabase functions deploy match-ride   # déploiement
```

## Edge Functions `accept-ride` et `verify-boarding-code`

**`accept-ride`** — POST `{ "proposal_id": "<uuid>" }` avec le JWT du
conducteur. Vérifie que la proposition lui est adressée, encore « en_cours »
et non expirée, puis crée la course (statut `confirmee`) sur le trajet retenu
par match-ride et génère le **code de montée à 3 chiffres** dans `ride_codes`.
Le code n'est jamais renvoyé au conducteur : seul le passager le lit et
l'énonce de vive voix.

**`verify-boarding-code`** — POST `{ "ride_id": "<uuid>", "code": "042" }`
avec le JWT du conducteur. La course doit être `arrive_a_l_arret` ; le code
est comparé côté serveur, et s'il correspond la course passe en `en_cours`
(le trigger de la machine à états horodate le départ).

## Suivi temps réel (Supabase Realtime)

Aucune table : la position est diffusée en **broadcast** sur un canal dédié à
la course, `course:{ride_id}` (événement `position`), toutes les **3 s**.
Côté mobile : `usePublishPosition` (conducteur) et `useRidePosition`
(passager, avec calcul d'ETA) dans `apps/mobile/src/hooks/`. Les constantes
et le calcul d'ETA vivent dans `packages/shared/src/tracking.ts` (testés).

## Appliquer les migrations

```bash
# Installer la CLI Supabase : https://supabase.com/docs/guides/cli
supabase init          # crée config.toml (une seule fois)
supabase link          # relie au projet Supabase distant
supabase db push       # applique les migrations
```

En local (`supabase start`, nécessite Docker), les migrations sont appliquées
automatiquement à chaque `supabase db reset`.
