import { Redirect } from 'expo-router';

// Point d'entrée : on redirige vers l'écran de connexion.
// Plus tard, cet écran choisira entre (auth) et l'espace selon la session.
export default function Index() {
  return <Redirect href="/connexion" />;
}
