import { useEffect } from 'react';
import * as Location from 'expo-location';
import {
  EVENT_POSITION,
  POSITION_INTERVAL_MS,
  rideChannelName,
  type PositionPayload,
} from '@comoov/shared';
import { supabase } from '@/lib/supabase';

/**
 * Côté conducteur : publie la position GPS toutes les 3 s sur le canal
 * Realtime de la course (broadcast éphémère, rien n'est persisté).
 *
 * À monter sur l'écran de prise en charge tant que la course est active
 * (de « conducteur_en_route » à « en_cours ») ; passer null pour arrêter.
 */
export function usePublishPosition(rideId: string | null): void {
  useEffect(() => {
    if (!rideId) {
      return;
    }

    let demonte = false;
    let abonnementGps: Location.LocationSubscription | null = null;
    const canal = supabase.channel(rideChannelName(rideId));
    canal.subscribe();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || demonte) {
        return;
      }
      const abonnement = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: POSITION_INTERVAL_MS,
          distanceInterval: 0,
        },
        (mesure) => {
          const position: PositionPayload = {
            lat: mesure.coords.latitude,
            lng: mesure.coords.longitude,
            heading: mesure.coords.heading,
            speed_ms: mesure.coords.speed,
            recorded_at: new Date(mesure.timestamp).toISOString(),
          };
          void canal.send({
            type: 'broadcast',
            event: EVENT_POSITION,
            payload: position,
          });
        },
      );
      if (demonte) {
        abonnement.remove();
        return;
      }
      abonnementGps = abonnement;
    })();

    return () => {
      demonte = true;
      abonnementGps?.remove();
      void supabase.removeChannel(canal);
    };
  }, [rideId]);
}
