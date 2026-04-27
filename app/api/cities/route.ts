import { NextRequest, NextResponse } from "next/server";
import rawCities from "world-cities-json/data/cities.json";
import type { CityOption } from "@/lib/cities";

type RawCity = {
  city?: string;
  city_ascii?: string;
  lat?: string;
  lng?: string;
  country?: string;
  iso2?: string;
  iso3?: string;
  admin_name?: string;
  capital?: string;
  population?: string;
  id?: string;
};

const BLOCKED_COUNTRY_CODES = new Set(["AM", "ARM", "KP", "PRK"]);
const BLOCKED_COUNTRIES = new Set(["armenia", "north korea"]);
const BLOCKED_CITY_NAMES = new Set(["armenia"]);
const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

export async function GET(request: NextRequest) {
  const query = normalize(request.nextUrl.searchParams.get("q") || "");
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 12, 20);

  if (query.length < 1) {
    return NextResponse.json({ cities: [] });
  }

  const cities = (rawCities as RawCity[])
    .filter((city) => cityAllowed(city) && cityMatches(city, query))
    .map((city) => ({ city, score: cityScore(city, query) }))
    .sort((a, b) => b.score - a.score || population(b.city) - population(a.city))
    .slice(0, limit)
    .map(({ city }) => toCityOption(city));

  return NextResponse.json({ cities });
}

function cityAllowed(city: RawCity): boolean {
  const country = normalize(city.country || "");
  if (BLOCKED_COUNTRIES.has(country)) return false;
  if (BLOCKED_CITY_NAMES.has(normalize(city.city || ""))) return false;
  if (city.iso2 && BLOCKED_COUNTRY_CODES.has(city.iso2.toUpperCase())) return false;
  if (city.iso3 && BLOCKED_COUNTRY_CODES.has(city.iso3.toUpperCase())) return false;
  return Boolean(city.city && city.country && Number.isFinite(Number(city.lat)) && Number.isFinite(Number(city.lng)));
}

function cityMatches(city: RawCity, query: string): boolean {
  const haystack = normalize([
    city.city,
    city.city_ascii,
    city.admin_name,
    city.country,
    city.iso2,
    city.iso3,
  ].filter(Boolean).join(" "));
  return haystack.includes(query);
}

function cityScore(city: RawCity, query: string): number {
  const cityName = normalize(city.city_ascii || city.city || "");
  const label = normalize([city.city_ascii || city.city, city.admin_name, city.country].filter(Boolean).join(" "));
  let score = 0;
  if (cityName === query) score += 1000;
  if (cityName.startsWith(query)) score += 600;
  if (label.startsWith(query)) score += 250;
  if (city.capital === "primary") score += 80;
  score += Math.min(population(city) / 100000, 100);
  return score;
}

function toCityOption(city: RawCity): CityOption {
  const country = displayCountry(city.country || "");
  const region = displayRegion(city.admin_name || "", city.iso2);
  return {
    value: city.id || `${city.city}-${city.iso2}-${city.admin_name}`.toLowerCase(),
    city: city.city || city.city_ascii || "",
    region,
    country,
    countryCode: city.iso2,
    lat: Number(city.lat),
    lon: Number(city.lng),
  };
}

function displayCountry(country: string): string {
  if (country === "United States") return "USA";
  if (country === "United Kingdom") return "UK";
  if (country === "United Arab Emirates") return "UAE";
  return country;
}

function displayRegion(region: string, countryCode?: string): string | undefined {
  if (!region) return undefined;
  if (countryCode === "US") return US_STATE_ABBREVIATIONS[region] || region;
  return region;
}

function population(city: RawCity): number {
  return Number(city.population) || 0;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
