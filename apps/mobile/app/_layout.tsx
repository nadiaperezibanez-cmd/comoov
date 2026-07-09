import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@comoov/shared';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.nuit },
          headerTintColor: colors.brume,
          contentStyle: { backgroundColor: colors.nuit },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(passager)" options={{ headerShown: false }} />
        <Stack.Screen name="(conducteur)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
