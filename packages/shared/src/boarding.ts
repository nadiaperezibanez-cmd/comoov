/**
 * Code de montée — logique pure, sans I/O.
 *
 * Généré à la confirmation de la course (Edge Function accept-ride), montré
 * uniquement au passager, énoncé de vive voix au conducteur qui le saisit ;
 * la vérification (Edge Function verify-boarding-code) fait passer la course
 * en « en_cours ».
 */

/** Le code de montée fait exactement 3 chiffres (règle produit). */
export const BOARDING_CODE_LENGTH = 3;

/**
 * Génère un code de montée à 3 chiffres, zéros de tête compris (« 042 »).
 * `random` doit renvoyer un nombre dans [0, 1[ — injecter une source
 * cryptographique en production, une valeur fixe dans les tests.
 */
export function generateBoardingCode(random: () => number = Math.random): string {
  const n = Math.floor(random() * 10 ** BOARDING_CODE_LENGTH);
  return String(n).padStart(BOARDING_CODE_LENGTH, '0');
}

/** Le texte est-il un code de montée bien formé ? */
export function isValidBoardingCode(code: string): boolean {
  return /^[0-9]{3}$/.test(code);
}

/**
 * Compare le code attendu et la saisie du conducteur (espaces tolérés).
 * Un code mal formé ne correspond jamais.
 */
export function boardingCodesMatch(expected: string, provided: string): boolean {
  const saisie = provided.trim();
  return isValidBoardingCode(saisie) && saisie === expected;
}
