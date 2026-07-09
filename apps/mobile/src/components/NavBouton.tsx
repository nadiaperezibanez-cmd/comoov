import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@comoov/shared';

type Props = {
  href: Href;
  label: string;
  variant?: 'primary' | 'ghost';
};

export function NavBouton({ href, label, variant = 'primary' }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable
        style={[styles.base, variant === 'primary' ? styles.primary : styles.ghost]}
      >
        <Text
          style={[
            styles.label,
            variant === 'primary' ? styles.labelPrimary : styles.labelGhost,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.jauneSignal,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.brume,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelPrimary: {
    color: colors.nuit,
  },
  labelGhost: {
    color: colors.brume,
  },
});
