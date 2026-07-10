import { describe, expect, it } from 'vitest';
import { RIDE_TRANSITIONS, canTransitionRide, type RideStatus } from './types';

const TOUS_LES_STATUTS: readonly RideStatus[] = [
  'confirmee',
  'conducteur_en_route',
  'arrive_a_l_arret',
  'en_cours',
  'terminee',
  'annulee',
];

describe('machine à états des courses', () => {
  it('suit le parcours nominal complet', () => {
    expect(canTransitionRide('confirmee', 'conducteur_en_route')).toBe(true);
    expect(canTransitionRide('conducteur_en_route', 'arrive_a_l_arret')).toBe(true);
    expect(canTransitionRide('arrive_a_l_arret', 'en_cours')).toBe(true);
    expect(canTransitionRide('en_cours', 'terminee')).toBe(true);
  });

  it("autorise l'annulation avant « en_cours »", () => {
    expect(canTransitionRide('confirmee', 'annulee')).toBe(true);
    expect(canTransitionRide('conducteur_en_route', 'annulee')).toBe(true);
    expect(canTransitionRide('arrive_a_l_arret', 'annulee')).toBe(true);
  });

  it("interdit l'annulation une fois le passager à bord", () => {
    expect(canTransitionRide('en_cours', 'annulee')).toBe(false);
  });

  it('interdit de sauter des étapes ou de revenir en arrière', () => {
    expect(canTransitionRide('confirmee', 'en_cours')).toBe(false);
    expect(canTransitionRide('confirmee', 'terminee')).toBe(false);
    expect(canTransitionRide('conducteur_en_route', 'confirmee')).toBe(false);
    expect(canTransitionRide('en_cours', 'arrive_a_l_arret')).toBe(false);
  });

  it('rend « terminee » et « annulee » définitifs', () => {
    for (const statut of ['terminee', 'annulee'] as const) {
      for (const cible of TOUS_LES_STATUTS) {
        expect(canTransitionRide(statut, cible)).toBe(false);
      }
    }
  });

  it("n'autorise jamais une transition vers soi-même", () => {
    for (const statut of TOUS_LES_STATUTS) {
      expect(RIDE_TRANSITIONS[statut]).not.toContain(statut);
    }
  });
});
