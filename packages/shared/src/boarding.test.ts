import { describe, expect, it } from 'vitest';
import {
  BOARDING_CODE_LENGTH,
  boardingCodesMatch,
  generateBoardingCode,
  isValidBoardingCode,
} from './boarding';

describe('generateBoardingCode', () => {
  it('fait exactement 3 chiffres (règle produit)', () => {
    expect(BOARDING_CODE_LENGTH).toBe(3);
    expect(generateBoardingCode()).toMatch(/^[0-9]{3}$/);
  });

  it('garde les zéros de tête', () => {
    expect(generateBoardingCode(() => 0)).toBe('000');
    expect(generateBoardingCode(() => 0.042999)).toBe('042');
  });

  it('atteint la borne haute sans la dépasser', () => {
    expect(generateBoardingCode(() => 0.9999999)).toBe('999');
  });

  it('produit toujours un code valide sur un large échantillon', () => {
    for (let i = 0; i < 1000; i++) {
      expect(isValidBoardingCode(generateBoardingCode())).toBe(true);
    }
  });
});

describe('isValidBoardingCode', () => {
  it('accepte exactement 3 chiffres', () => {
    expect(isValidBoardingCode('000')).toBe(true);
    expect(isValidBoardingCode('999')).toBe(true);
  });

  it('refuse tout le reste', () => {
    expect(isValidBoardingCode('42')).toBe(false);
    expect(isValidBoardingCode('0420')).toBe(false);
    expect(isValidBoardingCode('a42')).toBe(false);
    expect(isValidBoardingCode('')).toBe(false);
    expect(isValidBoardingCode(' 42')).toBe(false);
  });
});

describe('boardingCodesMatch', () => {
  it('accepte la bonne saisie, espaces tolérés', () => {
    expect(boardingCodesMatch('042', '042')).toBe(true);
    expect(boardingCodesMatch('042', ' 042 ')).toBe(true);
  });

  it('refuse une saisie différente ou mal formée', () => {
    expect(boardingCodesMatch('042', '043')).toBe(false);
    expect(boardingCodesMatch('042', '42')).toBe(false);
    expect(boardingCodesMatch('042', '')).toBe(false);
  });
});
