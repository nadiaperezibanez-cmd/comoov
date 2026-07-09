import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (conducteur) — demande entrante : passager, arrêts, compte à rebours 15 s
// pour accepter ou refuser.
export default function Demande() {
  return (
    <PlaceholderScreen
      titre="Nouvelle demande"
      sousTitre="Un passager t'attend à un arrêt. Accepte avant la fin du compte à rebours de 15 s (Sprint 3)."
    >
      <NavBouton href="/priseencharge" label="Accepter (démo)" />
      <NavBouton href="/enligne" label="Refuser" variant="ghost" />
    </PlaceholderScreen>
  );
}
