// Qovshaq Phase 1C — Post category definitions & templates
export const categories = [
  {
    id: "general",
    label: "Share Something",
    icon: "\u{1F4AC}",
    color: "q-primary",
    description: "Anything on your mind",
    templateFields: [],
  },
  {
    id: "event",
    label: "Event",
    icon: "\u{1F389}",
    color: "q-accent",
    description: "Invite people to something",
    templateFields: ["eventDate", "eventLocation", "eventCity", "eventCountry"],
  },
  {
    id: "opportunity",
    label: "Opportunity",
    icon: "\u{1F4BC}",
    color: "q-secondary",
    description: "Job, internship, or collaboration",
    templateFields: ["oppType", "oppCompany", "oppLocationMode", "oppApplyUrl"],
  },
  {
    id: "request",
    label: "Help / Request",
    icon: "\u{1F91D}",
    color: "q-success",
    description: "Ask for or offer help",
    templateFields: ["requestType"],
  },
  {
    id: "food",
    label: "Food & Culture",
    icon: "\u{1F375}",
    color: "q-accent",
    description: "Food meetups, recipes, culture",
    templateFields: [],
  },
  {
    id: "housing",
    label: "Housing",
    icon: "\u{1F3E0}",
    color: "q-primary",
    description: "Roommate, sublet, advice",
    templateFields: ["housingType", "priceRange"],
  },
  {
    id: "discussion",
    label: "Discussion",
    icon: "\u{1F4AD}",
    color: "q-text-muted",
    description: "Start a conversation",
    templateFields: [],
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: "\u{1F4E2}",
    color: "q-danger",
    description: "Important news",
    templateFields: [],
  },
];

export const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

export const templateFieldLabels = {
  eventDate: "Event Date",
  eventLocation: "Venue / Address",
  eventCity: "City",
  eventCountry: "Country",
  oppType: "Type",
  oppCompany: "Company",
  oppLocationMode: "Work Mode",
  oppApplyUrl: "Apply Link",
  oppContactEmail: "Contact Email",
  requestType: "Request Type",
  housingType: "Housing Type",
  priceRange: "Price Range",
};

export const templateFieldOptions = {
  oppType: ["Internship", "Full-time", "Part-time", "Contract", "Volunteer", "Collaboration"],
  oppLocationMode: ["Remote", "Hybrid", "On-site"],
  requestType: ["Help Wanted", "Looking For", "Offering"],
  housingType: ["Roommate", "Sublet", "Advice", "Looking"],
};
