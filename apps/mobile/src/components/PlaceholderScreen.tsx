import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@comoov/shared';

type Props = {
  titre: string;
  sousTitre?: string;
  accent?: keyof typeof colors;
  children?: ReactNode;
};

/**
 * Écran de démarrage réutilisable pour le squelette de navigation.
 * Les fonts Sora/Inter seront branchées dans un sprint ultérieur ; on garde
 * ici la police système pour que l'app tourne immédiatement.
 */
export function PlaceholderScreen({
  titre,
  sousTitre,
  accent = 'jauneSignal',
  children,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: colors[accent] }]} />
      <Text style={styles.titre}>{titre}</Text>
      {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.nuit,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.sm,
  },
  titre: {
    color: colors.brume,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  sousTitre: {
    color: colors.brume,
    opacity: 0.7,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});
