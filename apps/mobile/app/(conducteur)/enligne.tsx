import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (conducteur) — en ligne : déclaration du trajet (arrêt départ → arrivée,
// heure) et passage en ligne pour recevoir des demandes.
export default function EnLigne() {
  return (
    <PlaceholderScreen
      titre="Tu es en ligne"
      sousTitre="Déclare ton trajet sur la ligne pilote et attends une demande (Sprint 2 & 3)."
      accent="vert"
    >
      <NavBouton href="/demande" label="Demande entrante (démo)" />
      <NavBouton href="/gains" label="Voir mes gains" variant="ghost" />
    </PlaceholderScreen>
  );
}
