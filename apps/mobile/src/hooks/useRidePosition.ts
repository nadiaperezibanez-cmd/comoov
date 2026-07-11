import { useEffect, useMemo, useState } from 'react';
import {
  estimateEtaMinutes,
  EVENT_POSITION,
  rideChannelName,
  type PositionPayload,
} from '@comoov/shared';
import { supabase } from '@/lib/supabase';

export interface SuiviCourse {
  /** Dernière position reçue de la voiture, null tant que rien n'est arrivé */
  position: PositionPayload | null;
  /** ETA en minutes vers l'arrêt, null sans position ou sans arrêt */
  etaMinutes: number | null;
}

/**
 * Côté passager : suit la voiture sur le canal Realtime de la course et
 * calcule l'ETA vers l'arrêt de montée.
 *
 * À monter sur l'écran de suivi ; passer null pour se désabonner.
 */
export function useRidePosition(
  rideId: string | null,
  arret: { lat: number; lng: number } | null,
): SuiviCourse {
  const [position, setPosition] = useState<PositionPayload | null>(null);

  useEffect(() => {
    if (!rideId) {
      setPosition(null);
      return;
    }

    const canal = supabase
      .channel(rideChannelName(rideId))
      .on('broadcast', { event: EVENT_POSITION }, ({ payload }) => {
        setPosition(payload as PositionPayload);
      });
    canal.subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [rideId]);

  const etaMinutes = useMemo(() => {
    if (position === null || arret === null) {
      return null;
    }
    return estimateEtaMinutes(
      { lat: position.lat, lng: position.lng },
      arret,
      position.speed_ms,
    );
  }, [position, arret]);

  return { position, etaMinutes };
}
