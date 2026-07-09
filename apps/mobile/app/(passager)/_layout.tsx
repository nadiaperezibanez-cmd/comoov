import { Stack } from 'expo-router';
import { colors } from '@comoov/shared';

export default function PassagerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.nuit },
        headerTintColor: colors.brume,
        headerTitleStyle: { color: colors.brume },
        contentStyle: { backgroundColor: colors.nuit },
      }}
    >
      <Stack.Screen name="accueil" options={{ title: 'Accueil' }} />
      <Stack.Screen name="matching" options={{ title: 'Recherche…' }} />
      <Stack.Screen name="suivi" options={{ title: 'Ton conducteur arrive' }} />
      <Stack.Screen name="arrivee" options={{ title: 'Course terminée' }} />
    </Stack>
  );
}
