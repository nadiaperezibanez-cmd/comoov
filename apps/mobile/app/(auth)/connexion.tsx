import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (auth) — connexion OTP par SMS.
// Squelette : l'authentification Supabase (envoi + vérification du code)
// sera implémentée au Sprint 1. Les deux boutons permettent de parcourir
// les deux espaces dès maintenant sur Expo Go.
export default function Connexion() {
  return (
    <PlaceholderScreen
      titre="Comoov"
      sousTitre="Connexion par SMS (OTP) — à venir au Sprint 1. Choisis un espace pour explorer la maquette."
    >
      <NavBouton href="/accueil" label="Espace passager" />
      <NavBouton href="/enligne" label="Espace conducteur" variant="ghost" />
    </PlaceholderScreen>
  );
}
