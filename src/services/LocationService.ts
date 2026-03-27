/**
 * LocationService — wraps expo-location with graceful fallback.
 * Respects the locationTracking setting before requesting GPS.
 */
import * as ExpoLocation from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export class LocationService {
  private static instance: LocationService;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permission.
   * @returns true if granted, false otherwise.
   */
  public async requestPermission(): Promise<boolean> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get current location (coordinates + optional reverse-geocoded address).
   * Returns null if permission denied or location unavailable.
   */
  public async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('[LocationService] Permission denied — skipping GPS capture.');
        return null;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Attempt reverse geocoding for a human-readable address
      let address: string | undefined;
      try {
        const [geocode] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
        if (geocode) {
          address = [
            geocode.name,
            geocode.city,
            geocode.region,
            geocode.country,
          ]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Non-fatal — address is optional
        console.debug('[LocationService] Reverse geocoding failed, storing coordinates only.');
      }

      return { latitude, longitude, address };
    } catch (error) {
      console.error('[LocationService] Failed to get location:', error);
      return null;
    }
  }
}
