// Qovshaq Phase 2B — Location data & helpers

// Curated diaspora cities (prioritized in autocomplete)
export const diasporaCities = [
  { city: "Baku", country: "Azerbaijan", countryCode: "AZ" },
  { city: "Ganja", country: "Azerbaijan", countryCode: "AZ" },
  { city: "Sumgait", country: "Azerbaijan", countryCode: "AZ" },
  { city: "Istanbul", country: "Turkey", countryCode: "TR" },
  { city: "Ankara", country: "Turkey", countryCode: "TR" },
  { city: "Moscow", country: "Russia", countryCode: "RU" },
  { city: "Saint Petersburg", country: "Russia", countryCode: "RU" },
  { city: "London", country: "United Kingdom", countryCode: "GB" },
  { city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { city: "Berlin", country: "Germany", countryCode: "DE" },
  { city: "Munich", country: "Germany", countryCode: "DE" },
  { city: "Paris", country: "France", countryCode: "FR" },
  { city: "New York", country: "United States", countryCode: "US" },
  { city: "Los Angeles", country: "United States", countryCode: "US" },
  { city: "Houston", country: "United States", countryCode: "US" },
  { city: "Washington DC", country: "United States", countryCode: "US" },
  { city: "Chicago", country: "United States", countryCode: "US" },
  { city: "San Francisco", country: "United States", countryCode: "US" },
  { city: "Toronto", country: "Canada", countryCode: "CA" },
  { city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
  { city: "Tbilisi", country: "Georgia", countryCode: "GE" },
  { city: "Kyiv", country: "Ukraine", countryCode: "UA" },
  { city: "Warsaw", country: "Poland", countryCode: "PL" },
  { city: "Prague", country: "Czech Republic", countryCode: "CZ" },
  { city: "Vienna", country: "Austria", countryCode: "AT" },
  { city: "Rome", country: "Italy", countryCode: "IT" },
  { city: "Milan", country: "Italy", countryCode: "IT" },
  { city: "Barcelona", country: "Spain", countryCode: "ES" },
  { city: "Madrid", country: "Spain", countryCode: "ES" },
  { city: "Seoul", country: "South Korea", countryCode: "KR" },
  { city: "Tokyo", country: "Japan", countryCode: "JP" },
  { city: "Sydney", country: "Australia", countryCode: "AU" },
  { city: "Melbourne", country: "Australia", countryCode: "AU" },
  { city: "Stockholm", country: "Sweden", countryCode: "SE" },
  { city: "Oslo", country: "Norway", countryCode: "NO" },
  { city: "Helsinki", country: "Finland", countryCode: "FI" },
  { city: "Copenhagen", country: "Denmark", countryCode: "DK" },
  { city: "Zurich", country: "Switzerland", countryCode: "CH" },
  { city: "Brussels", country: "Belgium", countryCode: "BE" },
  { city: "Lisbon", country: "Portugal", countryCode: "PT" },
  { city: "Tel Aviv", country: "Israel", countryCode: "IL" },
  { city: "Singapore", country: "Singapore", countryCode: "SG" },
  { city: "Beijing", country: "China", countryCode: "CN" },
  { city: "Shanghai", country: "China", countryCode: "CN" },
  { city: "Mumbai", country: "India", countryCode: "IN" },
  { city: "Doha", country: "Qatar", countryCode: "QA" },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA" },
];

// Country code to flag emoji
export function countryFlag(code) {
  if (!code || code.length !== 2) return "\u{1F30D}";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// Format location display
export function formatLocation(loc) {
  if (!loc) return "";
  const flag = countryFlag(loc.countryCode);
  if (loc.city && loc.country) return `${flag} ${loc.city}, ${loc.country}`;
  if (loc.city) return `${flag} ${loc.city}`;
  if (loc.country) return `${flag} ${loc.country}`;
  return "";
}

// Search cities by query
export function searchCities(query) {
  if (!query) return diasporaCities.slice(0, 10);
  const q = query.toLowerCase();
  return diasporaCities.filter(
    (c) => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  );
}

// Get user location default from browser geolocation or profile
export async function getUserLocationDefault(user) {
  // If user has qLocation set, use it
  if (user?.qLocation?.city) {
    return user.qLocation;
  }

  // Try browser geolocation — returns a promise
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}
