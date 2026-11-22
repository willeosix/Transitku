export const BANDUNG_BOUNDS = {
  minLat: -6.97,
  maxLat: -6.84,
  minLng: 107.54,
  maxLng: 107.72,
} as const;

export const BANDUNG_CENTER = {
  latitude: -6.9147,
  longitude: 107.6098,
} as const;

export function isWithinBandungBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= BANDUNG_BOUNDS.minLat &&
    latitude <= BANDUNG_BOUNDS.maxLat &&
    longitude >= BANDUNG_BOUNDS.minLng &&
    longitude <= BANDUNG_BOUNDS.maxLng
  );
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return '-';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
