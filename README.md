# Comoov

Application de **micro-covoiturage courte distance à arrêts fixes**,
complémentaire aux bus et tramways. Deux rôles : **passager** et **conducteur**.
Le passager attend à un arrêt fixe ; un conducteur dont le trajet déclaré passe
par cet arrêt le prend en charge contre une contrepartie (partage de frais au
barème kilométrique — jamais de bénéfice).

> Le document de cadrage nomme le produit « Komov ». Le dépôt et la marque
> retenus sont **Comoov**.

## Monorepo

```
comoov/
├── apps/
│   ├── mobile/        # App passager + conducteur — React Native + Expo (expo-router)
│   └── backoffice/    # Console interne de modération — React + Vite
├── packages/
│   └── shared/        # Types de domaine et tokens de design partagés (@comoov/shared)
├── supabase/          # Migrations SQL et Edge Functions (sprints suivants)
└── CLAUDE.md          # Contexte projet lu par Claude Code à chaque session
```

Géré avec **pnpm workspaces**.

## Prérequis

- **Node.js ≥ 22** (voir `.nvmrc`)
- **pnpm 10** — `npm install -g pnpm`
- Pour le mobile : l'app **Expo Go** sur ton téléphone (ou un simulateur
  iOS / émulateur Android)

## Installation

```bash
pnpm install
```

> Après un changement de version d'Expo, aligne les dépendances natives avec
> `pnpm --filter @comoov/mobile exec expo install --fix`.

## Lancer les applications

### App mobile (Expo)

```bash
pnpm mobile
# puis scanne le QR code avec Expo Go, ou appuie sur « i » / « a »
```

Configuration : copie `apps/mobile/.env.example` en `apps/mobile/.env` et
renseigne les clés Supabase (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`). Pour la carte, renseigne aussi tes clés
Google Maps dans `apps/mobile/app.json`.

### Back-office (Vite)

```bash
pnpm backoffice
# ouvre http://localhost:5173
```

Configuration : copie `apps/backoffice/.env.example` en
`apps/backoffice/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Qualité

```bash
pnpm lint          # ESLint (flat config) sur tout le repo
pnpm format        # Prettier --write
pnpm typecheck     # tsc --noEmit sur chaque package
```

## Structure des écrans (mobile)

```
app/
├── index.tsx                    # redirection vers la connexion
├── (auth)/connexion.tsx         # connexion OTP par SMS
├── (passager)/
│   ├── accueil.tsx              # carte + choix de l'arrêt
│   ├── matching.tsx             # recherche d'un conducteur
│   ├── suivi.tsx                # suivi temps réel + code de montée
│   └── arrivee.tsx              # paiement + notation
└── (conducteur)/
    ├── enligne.tsx              # déclaration de trajet, passage en ligne
    ├── demande.tsx              # demande entrante (compte à rebours 15 s)
    ├── priseencharge.tsx        # vérification du code, course en cours
    └── gains.tsx                # historique et virements
```

Les écrans sont pour l'instant des **squelettes navigables** : ils posent la
structure et la charte, et se remplissent sprint par sprint (voir le plan de
développement et `CLAUDE.md`).

## Feuille de route

Le détail des sprints (juillet → décembre) est dans le plan de développement.
Ce dépôt correspond au **Sprint 0 — mise en place** : monorepo, structure des
apps, types partagés et outillage.
