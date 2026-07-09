import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (passager) — suivi : position de la voiture en temps réel (Supabase
// Realtime), ETA vers l'arrêt, code de montée à communiquer au conducteur.
export default function Suivi() {
  return (
    <PlaceholderScreen
      titre="Ton conducteur arrive"
      sousTitre="Suivi GPS temps réel, ETA et code de montée à 3 chiffres (Sprint 4)."
      accent="vert"
    >
      <NavBouton href="/arrivee" label="Course terminée (démo)" />
    </PlaceholderScreen>
  );
}
