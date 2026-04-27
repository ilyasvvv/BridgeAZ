import type { ApiUser } from "./types";

export type CityOption = {
  value: string;
  city: string;
  country: string;
  countryCode?: string;
  region?: string;
  lat: number;
  lon: number;
};

export const CITY_OPTIONS: CityOption[] = [
  { value: "fairfax-va-us", city: "Fairfax", region: "VA", country: "USA", lat: 38.8462, lon: -77.3064 },
  { value: "washington-dc-us", city: "Washington", region: "DC", country: "USA", lat: 38.9072, lon: -77.0369 },
  { value: "new-york-ny-us", city: "New York", region: "NY", country: "USA", lat: 40.7128, lon: -74.006 },
  { value: "los-angeles-ca-us", city: "Los Angeles", region: "CA", country: "USA", lat: 34.0522, lon: -118.2437 },
  { value: "san-francisco-ca-us", city: "San Francisco", region: "CA", country: "USA", lat: 37.7749, lon: -122.4194 },
  { value: "houston-tx-us", city: "Houston", region: "TX", country: "USA", lat: 29.7604, lon: -95.3698 },
  { value: "chicago-il-us", city: "Chicago", region: "IL", country: "USA", lat: 41.8781, lon: -87.6298 },
  { value: "toronto-ca", city: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  { value: "vancouver-ca", city: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207 },
  { value: "london-uk", city: "London", country: "UK", lat: 51.5072, lon: -0.1276 },
  { value: "berlin-de", city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  { value: "hamburg-de", city: "Hamburg", country: "Germany", lat: 53.5511, lon: 9.9937 },
  { value: "munich-de", city: "Munich", country: "Germany", lat: 48.1351, lon: 11.582 },
  { value: "paris-fr", city: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { value: "lyon-fr", city: "Lyon", country: "France", lat: 45.764, lon: 4.8357 },
  { value: "nice-fr", city: "Nice", country: "France", lat: 43.7102, lon: 7.262 },
  { value: "amsterdam-nl", city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  { value: "brussels-be", city: "Brussels", country: "Belgium", lat: 50.8503, lon: 4.3517 },
  { value: "istanbul-tr", city: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784 },
  { value: "ankara-tr", city: "Ankara", country: "Turkey", lat: 39.9334, lon: 32.8597 },
  { value: "dubai-ae", city: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708 },
  { value: "abu-dhabi-ae", city: "Abu Dhabi", country: "UAE", lat: 24.4539, lon: 54.3773 },
  { value: "baku-az", city: "Baku", country: "Azerbaijan", lat: 40.4093, lon: 49.8671 },
  { value: "tbilisi-ge", city: "Tbilisi", country: "Georgia", lat: 41.7151, lon: 44.8271 },
  { value: "warsaw-pl", city: "Warsaw", country: "Poland", lat: 52.2297, lon: 21.0122 },
  { value: "prague-cz", city: "Prague", country: "Czechia", lat: 50.0755, lon: 14.4378 },
  { value: "vienna-at", city: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738 },
  { value: "madrid-es", city: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
  { value: "barcelona-es", city: "Barcelona", country: "Spain", lat: 41.3874, lon: 2.1686 },
  { value: "rome-it", city: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  { value: "milan-it", city: "Milan", country: "Italy", lat: 45.4642, lon: 9.19 },
  { value: "stockholm-se", city: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686 },
  { value: "oslo-no", city: "Oslo", country: "Norway", lat: 59.9139, lon: 10.7522 },
  { value: "copenhagen-dk", city: "Copenhagen", country: "Denmark", lat: 55.6761, lon: 12.5683 },
  { value: "helsinki-fi", city: "Helsinki", country: "Finland", lat: 60.1699, lon: 24.9384 },
];

export function cityLabel(city: CityOption): string {
  return [city.city, city.region, city.country].filter(Boolean).join(", ");
}

export function citySearchText(city: CityOption): string {
  return normalizePlace([
    city.city,
    city.region,
    city.country,
    city.countryCode,
    cityLabel(city),
  ].filter(Boolean).join(" "));
}

export function findCityByValue(value: string): CityOption | undefined {
  return CITY_OPTIONS.find((city) => city.value === value);
}

export function findCityByParts(cityName?: string, countryName?: string): CityOption | undefined {
  const cityKey = normalizePlace(cityName || "");
  const countryKey = normalizePlace(countryName || "");
  if (!cityKey) return undefined;
  return CITY_OPTIONS.find((city) => {
    if (normalizePlace(city.city) !== cityKey) return false;
    return !countryKey || normalizePlace(city.country) === countryKey;
  });
}

export function findCityByLabel(label?: string): CityOption | undefined {
  const key = normalizePlace(label || "");
  if (!key) return undefined;
  return CITY_OPTIONS.find((city) => {
    const labels = [
      cityLabel(city),
      `${city.city}, ${city.country}`,
      city.city,
    ];
    return labels.some((labelValue) => normalizePlace(labelValue) === key);
  });
}

export function userCityLabel(user?: Pick<ApiUser, "locationNow" | "currentRegion"> | null): string {
  const cityName = user?.locationNow?.city?.trim();
  const region = user?.locationNow?.region?.trim();
  const country = user?.locationNow?.country?.trim();
  if (cityName && country) return [cityName, region, country].filter(Boolean).join(", ");

  const city = findCityByParts(user?.locationNow?.city, user?.locationNow?.country);
  if (city) return cityLabel(city);

  const fromRegion = findCityByLabel(user?.currentRegion);
  if (fromRegion) return cityLabel(fromRegion);

  return cityName || user?.currentRegion?.trim() || "";
}

export function sortUsersByNearestCity(users: ApiUser[], viewer?: ApiUser | null): ApiUser[] {
  const viewerCoords = viewer?.locationNow ? coordsFromLocation(viewer.locationNow) : null;
  const viewerCity = viewerCoords
    ? {
        value: "viewer-city",
        city: viewer?.locationNow?.city || "Selected city",
        country: viewer?.locationNow?.country || "",
        region: viewer?.locationNow?.region,
        lat: viewerCoords.lat,
        lon: viewerCoords.lon,
      }
    : findCityByParts(viewer?.locationNow?.city, viewer?.locationNow?.country) ||
      findCityByLabel(viewer?.currentRegion);

  return [...users].sort((a, b) => {
    const distanceA = cityDistanceForUser(a, viewerCity);
    const distanceB = cityDistanceForUser(b, viewerCity);
    if (distanceA !== distanceB) return distanceA - distanceB;
    return (a.name || "").localeCompare(b.name || "");
  });
}

function cityDistanceForUser(user: ApiUser, viewerCity?: CityOption): number {
  const userCoords = user.locationNow ? coordsFromLocation(user.locationNow) : null;
  if (viewerCity && userCoords) {
    return haversineMiles(viewerCity.lat, viewerCity.lon, userCoords.lat, userCoords.lon);
  }

  const userCity =
    findCityByParts(user.locationNow?.city, user.locationNow?.country) ||
    findCityByLabel(user.currentRegion);

  if (!viewerCity || !userCity) return Number.POSITIVE_INFINITY;
  return haversineMiles(viewerCity.lat, viewerCity.lon, userCity.lat, userCity.lon);
}

function coordsFromLocation(location: NonNullable<ApiUser["locationNow"]>): { lat: number; lon: number } | null {
  const lat = Number(location.lat);
  const lon = Number(location.lon ?? location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function normalizePlace(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(united states|usa|u\.s\.a\.)\b/g, "usa")
    .replace(/\b(united kingdom|great britain)\b/g, "uk")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
