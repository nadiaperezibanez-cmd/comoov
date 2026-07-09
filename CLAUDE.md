# Comoov — contexte projet

Application de micro-covoiturage courte distance à arrêts fixes,
complémentaire aux bus/tramways. Deux rôles : passager et conducteur.
Le passager attend à un arrêt fixe, un conducteur dont le trajet déclaré
passe par cet arrêt le prend en charge contre une contrepartie
(partage de frais, barème kilométrique — jamais de bénéfice).

> Le document de cadrage nomme le produit « Komov ». Le dépôt et la marque
> retenus sont **Comoov** : c'est ce nom qui est utilisé partout dans le code.

## Stack

- **Mobile** : React Native + Expo (TypeScript), expo-router, react-native-maps
- **Backend** : Supabase (Postgres, Auth OTP, Realtime, Edge Functions)
- **Paiements** : Stripe Connect Express
- **Back-office** : React + Vite (TypeScript)

## Structure du monorepo

```
apps/mobile       # application passager + conducteur (Expo)
apps/backoffice   # back-office interne de modération (React + Vite)
packages/shared   # types TypeScript et tokens de design partagés (@comoov/shared)
supabase/         # migrations SQL et Edge Functions (sprints suivants)
```

## Commandes

```bash
pnpm install                 # installe tout le monorepo
pnpm mobile                  # lance l'app Expo (Expo Go / dev build)
pnpm backoffice              # lance le back-office (Vite, http://localhost:5173)
pnpm lint                    # ESLint sur tout le repo
pnpm format                  # Prettier --write
pnpm typecheck               # tsc --noEmit sur chaque package
```

## Modèle de données (source : `packages/shared/src/types.ts`)

```
profiles        utilisateurs (nom, téléphone vérifié, note moyenne, rôle)
driver_docs     permis, carte grise, assurance (en_attente / valide / refuse)
lines           lignes Comoov (ex. « Mairie–Gare »)
stops           arrêts fixes (nom, lat/lng, line_id, ordre)
driver_trips    trajets déclarés (conducteur, arrêt départ/arrivée, heure, en_ligne)
ride_requests   demandes passager (arrêt montée/descente, statut, expire_at 15 s)
rides           courses confirmées (request_id, trip_id, code montée, statuts)
payments        paiements Stripe (ride_id, montant, commission, statut)
ratings         notes croisées passager ↔ conducteur
```

Les types partagés utilisent des noms de champs en `snake_case` pour
correspondre directement aux colonnes Postgres/Supabase.

## Règles

- Tout en **TypeScript strict**
- **Textes UI en français**
- Palette : nuit `#0F1B2D`, jaune signal `#FFC933`, brume `#E8EEF4`, vert `#14B87D`
  (exposée dans `@comoov/shared` → `colors`)
- Police titres : **Sora** / textes : **Inter**
- Toujours écrire les migrations SQL dans `supabase/migrations/`
- Tests sur la **logique de matching** et la **machine à états des courses**
- La contrepartie est calculée sur le **barème kilométrique** (partage de
  frais, jamais de bénéfice) — c'est ce qui maintient Comoov dans le cadre du
  covoiturage et évite le statut VTC aux conducteurs.

## Conventions de code

- Composants et écrans en `.tsx`, logique pure en `.ts`
- Import des types et tokens partagés via `@comoov/shared`
- Les statuts (course, demande, document, paiement) sont des unions de chaînes
  littérales définies dans `@comoov/shared` — ne jamais utiliser de chaînes
  libres à la place.
