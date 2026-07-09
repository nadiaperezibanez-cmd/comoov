import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (conducteur) — prise en charge : navigation vers l'arrêt, saisie du code
// de montée à 3 chiffres, passage de la course en « en cours ».
export default function PriseEnCharge() {
  return (
    <PlaceholderScreen
      titre="Prise en charge"
      sousTitre="Rejoins l'arrêt, vérifie le code de montée du passager puis démarre la course (Sprint 4)."
      accent="vert"
    >
      <NavBouton href="/gains" label="Terminer la course (démo)" />
    </PlaceholderScreen>
  );
}
