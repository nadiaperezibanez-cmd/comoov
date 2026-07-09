import { Stack } from 'expo-router';
import { colors } from '@comoov/shared';

export default function ConducteurLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.nuit },
        headerTintColor: colors.brume,
        headerTitleStyle: { color: colors.brume },
        contentStyle: { backgroundColor: colors.nuit },
      }}
    >
      <Stack.Screen name="enligne" options={{ title: 'En ligne' }} />
      <Stack.Screen name="demande" options={{ title: 'Nouvelle demande' }} />
      <Stack.Screen name="priseencharge" options={{ title: 'Prise en charge' }} />
      <Stack.Screen name="gains" options={{ title: 'Mes gains' }} />
    </Stack>
  );
}
