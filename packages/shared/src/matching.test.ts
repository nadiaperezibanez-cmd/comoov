import { describe, expect, it } from 'vitest';
import {
  PROPOSAL_TTL_SECONDS,
  rankCandidates,
  selectNextDriver,
  tripServesJourney,
  type CandidateTrip,
  type JourneyContext,
} from './matching';

// Ligne pilote fictive : arrêts d'ordre 0 à 5.
const LIGNE = 'ligne-pilote';
const PASSAGERE = 'alice';

function trip(overrides: Partial<CandidateTrip> = {}): CandidateTrip {
  return {
    trip_id: 'trajet-1',
    driver_id: 'bob',
    line_id: LIGNE,
    status: 'en_ligne',
    departure_at: '2026-07-11T08:00:00Z',
    start_order: 0,
    end_order: 5,
    driver_rating: null,
    ...overrides,
  };
}

function journey(overrides: Partial<JourneyContext> = {}): JourneyContext {
  return {
    line_id: LIGNE,
    passenger_id: PASSAGERE,
    pickup_order: 1,
    dropoff_order: 3,
    ...overrides,
  };
}

describe('règle produit', () => {
  it('la proposition expire au bout de 15 secondes', () => {
    expect(PROPOSAL_TTL_SECONDS).toBe(15);
  });
});

describe('tripServesJourney — éligibilité d’un trajet', () => {
  it('accepte un trajet aller qui englobe la montée et la descente', () => {
    expect(tripServesJourney(trip({ start_order: 0, end_order: 5 }), journey())).toBe(
      true,
    );
  });

  it('accepte une montée à l’arrêt de départ du conducteur (détour nul)', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 1, end_order: 5 }),
        journey({ pickup_order: 1, dropoff_order: 3 }),
      ),
    ).toBe(true);
  });

  it('accepte une descente à l’arrêt d’arrivée du conducteur', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 0, end_order: 3 }),
        journey({ pickup_order: 1, dropoff_order: 3 }),
      ),
    ).toBe(true);
  });

  it('refuse si le passager descend après l’arrivée du conducteur', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 0, end_order: 3 }),
        journey({ pickup_order: 1, dropoff_order: 4 }),
      ),
    ).toBe(false);
  });

  it('refuse si le passager monte avant le départ du conducteur', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 2, end_order: 5 }),
        journey({ pickup_order: 1, dropoff_order: 3 }),
      ),
    ).toBe(false);
  });

  it('accepte un trajet retour (ordres décroissants) dans le même sens', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 5, end_order: 0 }),
        journey({ pickup_order: 4, dropoff_order: 1 }),
      ),
    ).toBe(true);
  });

  it('refuse un conducteur roulant en sens inverse du passager', () => {
    expect(
      tripServesJourney(
        trip({ start_order: 0, end_order: 5 }),
        journey({ pickup_order: 3, dropoff_order: 1 }),
      ),
    ).toBe(false);
  });

  it('refuse un trajet d’une autre ligne', () => {
    expect(tripServesJourney(trip({ line_id: 'autre-ligne' }), journey())).toBe(false);
  });

  it('refuse un trajet dégénéré (départ = arrivée)', () => {
    expect(tripServesJourney(trip({ start_order: 2, end_order: 2 }), journey())).toBe(
      false,
    );
  });
});

describe('rankCandidates — filtrage', () => {
  it('écarte les conducteurs hors ligne ou ayant terminé', () => {
    const candidats = [
      trip({ trip_id: 't1', status: 'hors_ligne' }),
      trip({ trip_id: 't2', status: 'termine' }),
    ];
    expect(rankCandidates(candidats, journey())).toEqual([]);
  });

  it('écarte le passager lui-même s’il est aussi conducteur', () => {
    const candidats = [trip({ driver_id: PASSAGERE })];
    expect(rankCandidates(candidats, journey())).toEqual([]);
  });

  it('écarte les conducteurs déjà sollicités (rotation)', () => {
    const candidats = [trip({ driver_id: 'bob' }), trip({ driver_id: 'chloe' })];
    const resultat = rankCandidates(candidats, journey({ excluded_driver_ids: ['bob'] }));
    expect(resultat.map((t) => t.driver_id)).toEqual(['chloe']);
  });
});

describe('rankCandidates — classement du « mieux placé »', () => {
  it('privilégie le conducteur dont le départ est le plus proche de la montée', () => {
    const loin = trip({ trip_id: 't-loin', driver_id: 'bob', start_order: 0 });
    const proche = trip({ trip_id: 't-proche', driver_id: 'chloe', start_order: 1 });
    const resultat = rankCandidates([loin, proche], journey({ pickup_order: 1 }));
    expect(resultat.map((t) => t.driver_id)).toEqual(['chloe', 'bob']);
  });

  it('à distance égale, privilégie la meilleure note (jamais noté en dernier)', () => {
    const sansNote = trip({ trip_id: 't1', driver_id: 'bob', driver_rating: null });
    const bienNote = trip({ trip_id: 't2', driver_id: 'chloe', driver_rating: 4.8 });
    const moyen = trip({ trip_id: 't3', driver_id: 'david', driver_rating: 3.2 });
    const resultat = rankCandidates([sansNote, bienNote, moyen], journey());
    expect(resultat.map((t) => t.driver_id)).toEqual(['chloe', 'david', 'bob']);
  });

  it('à note égale, privilégie le départ le plus tôt', () => {
    const tard = trip({
      trip_id: 't1',
      driver_id: 'bob',
      departure_at: '2026-07-11T09:00:00Z',
    });
    const tot = trip({
      trip_id: 't2',
      driver_id: 'chloe',
      departure_at: '2026-07-11T08:00:00Z',
    });
    const resultat = rankCandidates([tard, tot], journey());
    expect(resultat.map((t) => t.driver_id)).toEqual(['chloe', 'bob']);
  });

  it('reste déterministe en cas d’égalité parfaite (tri par trip_id)', () => {
    const t2 = trip({ trip_id: 't2', driver_id: 'chloe' });
    const t1 = trip({ trip_id: 't1', driver_id: 'bob' });
    expect(rankCandidates([t2, t1], journey()).map((t) => t.trip_id)).toEqual([
      't1',
      't2',
    ]);
  });
});

describe('selectNextDriver — rotation', () => {
  it('retourne le mieux placé', () => {
    const candidats = [
      trip({ trip_id: 't1', driver_id: 'bob', start_order: 0 }),
      trip({ trip_id: 't2', driver_id: 'chloe', start_order: 1 }),
    ];
    expect(selectNextDriver(candidats, journey({ pickup_order: 1 }))?.driver_id).toBe(
      'chloe',
    );
  });

  it('passe au conducteur suivant quand le premier a déjà été sollicité', () => {
    const candidats = [
      trip({ trip_id: 't1', driver_id: 'bob', start_order: 1 }),
      trip({ trip_id: 't2', driver_id: 'chloe', start_order: 0 }),
    ];
    const suivant = selectNextDriver(
      candidats,
      journey({ pickup_order: 1, excluded_driver_ids: ['bob'] }),
    );
    expect(suivant?.driver_id).toBe('chloe');
  });

  it('retourne null quand plus aucun candidat (demande à expirer)', () => {
    const candidats = [trip({ driver_id: 'bob' })];
    expect(
      selectNextDriver(candidats, journey({ excluded_driver_ids: ['bob'] })),
    ).toBeNull();
  });
});
