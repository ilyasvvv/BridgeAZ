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

export const regionLabel = (region) => {
  if (region === null || region === undefined) return "";
  const value = String(region).trim();
  if (!value) return "";
  if (value.toUpperCase() === "ALL") return "All";
  return value;
};

export const countryLabel = (country) => {
  if (country === null || country === undefined) return "";
  const value = String(country).trim();
  if (!value) return "";
  return value;
};
