/**
 * Tokens de design partagés entre le mobile et le back-office.
 * Source unique de vérité pour la charte Comoov (voir CLAUDE.md).
 */

export const colors = {
  /** Fond principal, textes sombres */
  nuit: '#0F1B2D',
  /** Couleur d'accent / call-to-action */
  jauneSignal: '#FFC933',
  /** Fonds clairs, surfaces */
  brume: '#E8EEF4',
  /** Succès, gains, états « en cours » positifs */
  vert: '#14B87D',
  /** Textes secondaires, éléments désactivés */
  gris: '#64748B',
  /** Neutres utilitaires */
  blanc: '#FFFFFF',
  noir: '#000000',
} as const;

export type ColorName = keyof typeof colors;

export const fonts = {
  /** Titres */
  titres: 'Sora',
  /** Corps de texte */
  textes: 'Inter',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  /** Boutons principaux : coins arrondis 16 px (charte) */
  bouton: 16,
  lg: 20,
  pill: 999,
} as const;
