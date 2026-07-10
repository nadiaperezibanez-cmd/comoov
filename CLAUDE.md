# Comoov — contexte projet

Application de micro-covoiturage courte distance à **arrêts fixes**,
complémentaire aux bus et tramways. Un passager qui attend à un arrêt peut
être pris en charge par un conducteur dont le trajet déclaré passe par cet
arrêt, contre une petite contrepartie. Suivi du véhicule en temps réel sur
carte, façon Uber, mais uniquement d'arrêt fixe à arrêt fixe — jamais de
porte-à-porte.

> Le document de cadrage nomme le produit « Komov ». Le dépôt et la marque
> retenus sont **Comoov** : c'est ce nom qui est utilisé partout dans le code.

## Règle métier fondamentale (non négociable)

La contrepartie versée au conducteur relève du **partage de frais**
(article L3132-1 du code des transports) : elle est calculée sur le barème
kilométrique et ne doit **jamais** générer de bénéfice pour le conducteur.
C'est ce qui distingue Comoov d'un VTC et dispense les conducteurs de tout
statut professionnel. Toute logique de tarification doit respecter ce plafond.

## Les deux rôles

- **Passager** : cherche un trajet depuis un arrêt fixe → matching → suit la
  voiture sur la carte → monte avec un code de vérification → paie dans
  l'app → note le conducteur
- **Conducteur** : déclare son trajet (arrêt départ → arrêt arrivée) → passe
  en ligne → reçoit des demandes (expiration 15 s) → prend en charge à
  l'arrêt fixe (détour nul) → vérifie le code de montée → reçoit sa
  contrepartie (virement hebdomadaire le lundi)

## Stack

- **Mobile** : React Native + Expo (TypeScript), expo-router, react-native-maps
- **Backend** : Supabase — Postgres, Auth OTP par SMS, Realtime (positions
  GPS), Edge Functions (matching, génération des codes)
- **Paiements** : Stripe Connect Express (le passager paie dans l'app, Comoov
  prélève sa commission, l'argent des conducteurs ne transite jamais par le
  compte de la société)
- **Notifications** : Expo Push
- **Back-office** : React + Vite + TypeScript (validation des documents
  conducteurs, courses, litiges)

## Structure du monorepo

```
apps/mobile         # app Expo (écrans passager + conducteur)
apps/backoffice     # back-office web React + Vite
packages/shared     # types TypeScript et tokens de design partagés (@comoov/shared)
supabase/migrations # toutes les migrations SQL, jamais de modification directe du schéma
```

## Commandes

```bash
pnpm install                 # installe tout le monorepo
pnpm mobile                  # lance l'app Expo (Expo Go / dev build)
pnpm backoffice              # lance le back-office (Vite, http://localhost:5173)
pnpm test                    # tests (vitest) sur tout le repo
pnpm lint                    # ESLint sur tout le repo
pnpm format                  # Prettier --write
pnpm typecheck               # tsc --noEmit sur chaque package
```

## Modèle de données (source : `packages/shared/src/types.ts`)

```
profiles        utilisateurs (nom, téléphone vérifié, note moyenne, rôle)
driver_docs     permis, carte grise, assurance (en_attente / valide / refuse)
lines           lignes Comoov (MVP : une seule ligne pilote)
stops           arrêts fixes (nom, lat/lng, line_id, ordre sur la ligne)
driver_trips    trajets déclarés (conducteur, arrêts départ/arrivée, statut en_ligne)
ride_requests   demandes passager (arrêt montée/descente, statut, expire_at 15 s)
rides           courses (request_id, trip_id, code montée, machine à états, horodatages)
payments        paiements Stripe (ride_id, montant, commission, statut)
ratings         notes croisées passager ↔ conducteur
```

Machine à états d'une course :
`confirmee → conducteur_en_route → arrive_a_l_arret → en_cours → terminee`
(+ `annulee` possible **avant** `en_cours`, jamais après).

Les types partagés utilisent des noms de champs en `snake_case` pour
correspondre directement aux colonnes Postgres/Supabase.

## Design

- Palette : nuit `#0F1B2D` · jaune signal `#FFC933` · brume `#E8EEF4` ·
  vert gain `#14B87D` · gris `#64748B` (exposée dans `@comoov/shared` → `colors`)
- Polices : **Sora** (titres, gras 700–800) · **Inter** (textes)
- Langage visuel « signalétique transport » : les arrêts sont dessinés comme
  des stations de ligne, la ligne Comoov en pointillés jaunes sur la carte
- Boutons principaux : fond jaune, texte nuit, coins arrondis 16 px
  (`radius.bouton` dans `@comoov/shared`)

## Conventions de code

- TypeScript **strict** partout, pas de `any`
- Tous les textes UI en **français**
- RLS activé sur toutes les tables : un utilisateur ne lit que ses propres
  données, les admins lisent tout
- Tests obligatoires sur : la logique de matching, la machine à états des
  courses, le calcul de la contrepartie (plafond barème kilométrique)
- Commits en français, préfixés par le domaine : `mobile:`, `backoffice:`,
  `db:`, `matching:`, `shared:`, `docs:`
- Après chaque fonctionnalité : lancer les tests, puis vérifier sur Expo Go
  avant de passer à la suite
- Composants et écrans en `.tsx`, logique pure en `.ts`
- Import des types et tokens partagés via `@comoov/shared`
- Les statuts (course, demande, document, paiement) sont des unions de
  chaînes littérales définies dans `@comoov/shared` — ne jamais utiliser de
  chaînes libres à la place

## État d'avancement

- [ ] Sprint 0 : setup monorepo ✅ · projet Supabase et comptes stores (côté fondatrice) ⏳
- [ ] Sprint 1 : auth OTP, profils, carte + ligne pilote
- [ ] Sprint 2 : parcours conducteur (documents, trajet déclaré, en ligne)
- [ ] Sprint 3 : matching + demandes avec expiration 15 s
- [ ] Sprint 4 : suivi temps réel + code de montée
- [ ] Sprint 5 : paiements Stripe Connect
- [ ] Sprint 6 : back-office
- [ ] Sprint 7 : notifications push, RGPD, CGU
- [ ] Sprint 8 : bêta fermée (TestFlight + test interne Play Console)
- [ ] Sprint 9 : soumission stores

Mettre à jour cette liste à la fin de chaque sprint.
