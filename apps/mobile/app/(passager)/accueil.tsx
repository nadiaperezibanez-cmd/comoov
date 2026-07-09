import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (passager) — accueil : carte de la ligne pilote, choix de l'arrêt,
// bouton « chercher un conducteur ».
export default function Accueil() {
  return (
    <PlaceholderScreen
      titre="Où veux-tu aller ?"
      sousTitre="Carte de la ligne pilote et sélection de l'arrêt de montée (Sprint 1 & 3)."
    >
      <NavBouton href="/matching" label="Chercher un conducteur" />
    </PlaceholderScreen>
  );
}
