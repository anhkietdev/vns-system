// utils/location.ts - Tiện ích tính khoảng cách theo vị trí
// Gói cần cài: expo-location

/**
 * Tính khoảng cách giữa 2 tọa độ (Haversine formula)
 * @returns khoảng cách tính bằng km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format khoảng cách dạng dễ đọc
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Tọa độ các điểm đến nổi tiếng ở Việt Nam.
 * NOTE: In the future, these should be fetched from the Destination API
 * (which already stores lat/lng per destination). This static map serves
 * as a fallback until the mobile codebase is refactored to use API coordinates.
 *
 * Duplicates removed: "Nha Trang" → same as "Khánh Hòa",
 * "Đà Lạt" → same as "Lâm Đồng", "Huế" → same as "Thừa Thiên Huế".
 * "Sapa" kept as it's a distinct tourist area from "Lào Cai".
 */
export const DESTINATION_COORDINATES: Record<
  string,
  { lat: number; lon: number }
> = {
  "Quảng Ninh": { lat: 20.959, lon: 107.0448 },
  "Quảng Bình": { lat: 17.4688, lon: 106.6222 },
  "Hà Nội": { lat: 21.0285, lon: 105.8542 },
  "Đà Nẵng": { lat: 16.0544, lon: 108.2022 },
  "Phú Quốc": { lat: 10.2279, lon: 103.9598 },
  "Khánh Hòa": { lat: 12.2585, lon: 109.1967 },
  "Lâm Đồng": { lat: 11.9465, lon: 108.4419 },
  "Thừa Thiên Huế": { lat: 16.4637, lon: 107.5909 },
  "Lào Cai": { lat: 22.338, lon: 104.1487 },
  Sapa: { lat: 22.3363, lon: 103.8438 },
  "Hội An": { lat: 15.8801, lon: 108.338 },
  "Hồ Chí Minh": { lat: 10.8231, lon: 106.6297 },
  "Kiên Giang": { lat: 10.0125, lon: 105.0809 },
  // Aliases for lookup flexibility (point to same coordinates)
  "Nha Trang": { lat: 12.2388, lon: 109.1967 },
  "Đà Lạt": { lat: 11.9465, lon: 108.4419 },
  Huế: { lat: 16.4637, lon: 107.5909 },
};

/**
 * Resolve coordinates for a destination by name.
 * First checks the static map; future versions can integrate API-fetched data.
 */
export function getDestinationCoordinates(
  name: string,
): { lat: number; lon: number } | null {
  return DESTINATION_COORDINATES[name] ?? null;
}

/**
 * Resolve coordinates with multiple fallback names.
 * Example: getCoordsForDest(dest) → tries dest.location, then dest.city
 */
export function resolveCoordinates(
  ...names: (string | undefined | null)[]
): { lat: number; lon: number } | null {
  for (const name of names) {
    if (name) {
      const coords = getDestinationCoordinates(name);
      if (coords) return coords;
    }
  }
  return null;
}
