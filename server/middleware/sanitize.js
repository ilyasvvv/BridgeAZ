const sanitizeHtml = require("sanitize-html");

// Strip ALL HTML tags — plain text only
const stripHtml = (value) => {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
};

// Sanitize a string with a max length
const sanitizeString = (value, maxLength) => {
  if (typeof value !== "string") return value;
  const clean = stripHtml(value);
  return maxLength ? clean.slice(0, maxLength) : clean;
};

// Field length limits
const FIELD_LIMITS = {
  name: 100,
  headline: 200,
  bio: 2000,
  content: 5000, // post content
  comment: 2000,
  message: 2000, // chat/mentorship messages
  skill: 100,
  title: 200,
  description: 5000,
  company: 200,
  institution: 200,
  note: 2000
};

// Sanitize an object's string fields according to a limits map
// limits: { fieldName: maxLength }
const sanitizeFields = (obj, limits) => {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  for (const [key, maxLen] of Object.entries(limits)) {
    if (result[key] !== undefined && typeof result[key] === "string") {
      result[key] = sanitizeString(result[key], maxLen);
    }
  }
  return result;
};

// Sanitize array of strings (e.g., skills, tags)
const sanitizeStringArray = (arr, maxItemLength, maxItems = 50) => {
  if (!Array.isArray(arr)) return arr;
  return arr
    .slice(0, maxItems)
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeString(item, maxItemLength))
    .filter(Boolean);
};

// Sanitize education/experience arrays
const sanitizeEducationArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(0, 20).map((item) =>
    sanitizeFields(item, {
      institution: FIELD_LIMITS.institution,
      degree: 200,
      fieldOfStudy: 200,
      country: 100
    })
  );
};

const sanitizeExperienceArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(0, 20).map((item) =>
    sanitizeFields(item, {
      title: FIELD_LIMITS.title,
      org: FIELD_LIMITS.company,
      company: FIELD_LIMITS.company,
      role: 200,
      description: FIELD_LIMITS.description,
      country: 100
    })
  );
};

const sanitizeProjectsArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(0, 20).map((item) =>
    sanitizeFields(item, {
      title: FIELD_LIMITS.title,
      description: FIELD_LIMITS.description,
      link: 500
    })
  );
};

module.exports = {
  stripHtml,
  sanitizeString,
  sanitizeFields,
  sanitizeStringArray,
  sanitizeEducationArray,
  sanitizeExperienceArray,
  sanitizeProjectsArray,
  FIELD_LIMITS
};
