import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (passager) — arrivée : récapitulatif, paiement (Stripe) et notation du
// conducteur.
export default function Arrivee() {
  return (
    <PlaceholderScreen
      titre="Course terminée"
      sousTitre="Récapitulatif, paiement Stripe et notation du conducteur (Sprint 5)."
    >
      <NavBouton href="/accueil" label="Retour à l'accueil" variant="ghost" />
    </PlaceholderScreen>
  );
}
