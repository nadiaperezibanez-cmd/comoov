import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { NavBouton } from '@/components/NavBouton';

// (conducteur) — gains : historique des courses, contreparties (barème
// kilométrique) et virements hebdomadaires Stripe Connect.
export default function Gains() {
  return (
    <PlaceholderScreen
      titre="Mes gains"
      sousTitre="Historique des courses, contreparties au barème kilométrique et virements hebdo (Sprint 5)."
    >
      <NavBouton href="/enligne" label="Retour" variant="ghost" />
    </PlaceholderScreen>
  );
}
