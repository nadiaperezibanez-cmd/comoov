import { describe, expect, it } from 'vitest';
import {
  DEFAULT_URBAN_SPEED_KMH,
  estimateEtaMinutes,
  EVENT_POSITION,
  haversineKm,
  POSITION_INTERVAL_MS,
  rideChannelName,
} from './tracking';

// Repères parisiens connus pour vérifier la distance.
const NOTRE_DAME = { lat: 48.853, lng: 2.3499 };
const LOUVRE = { lat: 48.8606, lng: 2.3376 };
const GARE_DE_LYON = { lat: 48.8443, lng: 2.3743 };

describe('règles produit', () => {
  it('publie la position toutes les 3 secondes', () => {
    expect(POSITION_INTERVAL_MS).toBe(3000);
  });

  it("nomme le canal d'après l'id de la course", () => {
    expect(rideChannelName('abc-123')).toBe('course:abc-123');
  });

  it("l'événement de position est stable (contrat conducteur ↔ passager)", () => {
    expect(EVENT_POSITION).toBe('position');
  });
});

describe('haversineKm', () => {
  it('distance nulle entre un point et lui-même', () => {
    expect(haversineKm(NOTRE_DAME, NOTRE_DAME)).toBe(0);
  });

  it('Notre-Dame → Louvre ≈ 1,2 km', () => {
    const d = haversineKm(NOTRE_DAME, LOUVRE);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.4);
  });

  it('Notre-Dame → Gare de Lyon ≈ 2 km', () => {
    const d = haversineKm(NOTRE_DAME, GARE_DE_LYON);
    expect(d).toBeGreaterThan(1.7);
    expect(d).toBeLessThan(2.3);
  });

  it('est symétrique', () => {
    expect(haversineKm(NOTRE_DAME, LOUVRE)).toBeCloseTo(
      haversineKm(LOUVRE, NOTRE_DAME),
      10,
    );
  });
});

describe('estimateEtaMinutes', () => {
  it('utilise la vitesse moyenne urbaine sans vitesse GPS', () => {
    // ≈ 2 km à 25 km/h ≈ 4,8 min → arrondi à 5
    const eta = estimateEtaMinutes(NOTRE_DAME, GARE_DE_LYON);
    expect(eta).toBeGreaterThanOrEqual(4);
    expect(eta).toBeLessThanOrEqual(6);
  });

  it('utilise la vitesse GPS quand la voiture roule', () => {
    // ≈ 2 km à 50 km/h (13,9 m/s) ≈ 2,4 min → arrondi à 3
    const eta = estimateEtaMinutes(NOTRE_DAME, GARE_DE_LYON, 13.9);
    expect(eta).toBeLessThanOrEqual(3);
  });

  it('ignore une vitesse GPS quasi nulle (voiture à l’arrêt)', () => {
    const etaArret = estimateEtaMinutes(NOTRE_DAME, GARE_DE_LYON, 0.2);
    const etaDefaut = estimateEtaMinutes(NOTRE_DAME, GARE_DE_LYON);
    expect(etaArret).toBe(etaDefaut);
  });

  it("n'affiche jamais moins d'une minute", () => {
    expect(estimateEtaMinutes(NOTRE_DAME, NOTRE_DAME)).toBe(1);
    expect(estimateEtaMinutes(NOTRE_DAME, NOTRE_DAME, 30)).toBe(1);
  });

  it('la vitesse par défaut est bien 25 km/h (règle produit)', () => {
    expect(DEFAULT_URBAN_SPEED_KMH).toBe(25);
  });
});
