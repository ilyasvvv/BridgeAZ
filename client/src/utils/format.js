export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const REGION_MAP = {
  AZ: "Azerbaijan", TR: "Turkey", DE: "Germany", UK: "United Kingdom",
  UAE: "United Arab Emirates", US: "United States", RU: "Russia",
  GE: "Georgia", KZ: "Kazakhstan", FR: "France", IT: "Italy",
  ES: "Spain", NL: "Netherlands", SE: "Sweden", NO: "Norway",
  CH: "Switzerland", CA: "Canada", AU: "Australia", JP: "Japan",
  KR: "South Korea", CN: "China", IN: "India", BR: "Brazil",
  SA: "Saudi Arabia", QA: "Qatar", IL: "Israel", PL: "Poland",
  CZ: "Czechia", AT: "Austria", BE: "Belgium", PT: "Portugal",
  IE: "Ireland", DK: "Denmark", FI: "Finland", SG: "Singapore",
};

export const regionLabel = (region) => {
  if (region === null || region === undefined) return "";
  const value = String(region).trim();
  if (!value) return "";
  if (value.toUpperCase() === "ALL") return "All";
  return REGION_MAP[value.toUpperCase()] || value;
};

export const countryLabel = (country) => {
  if (country === null || country === undefined) return "";
  const value = String(country).trim();
  if (!value) return "";
  return value;
};
