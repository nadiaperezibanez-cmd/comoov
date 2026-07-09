import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (passager) — matching : recherche d'un conducteur en ligne, attente de
// l'acceptation (compte à rebours côté conducteur).
export default function Matching() {
  return (
    <PlaceholderScreen
      titre="Recherche d'un conducteur…"
      sousTitre="Appel de la Edge Function match-ride puis attente de l'acceptation (Sprint 3)."
      accent="vert"
    >
      <NavBouton href="/suivi" label="Conducteur trouvé (démo)" />
    </PlaceholderScreen>
  );
}
