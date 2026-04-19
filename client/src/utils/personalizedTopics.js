/* ═══════════════════════════════════════════════════
   PERSONALIZED TOPIC CHIPS
   Rank topics by relevance to the current user and
   return up to 8 as {id, label} chips for search.
   Signals used:
   - User profile: userType, headline, skills, education,
     experience, locationNow, currentRegion
   - Recent click history (from useSmartSearch memory)
   ═══════════════════════════════════════════════════ */

const TOPIC_CATALOG = [
  { id: "mentor",      label: "Mentors",     match: ["mentor","professional","senior","coach"] },
  { id: "student",     label: "Students",    match: ["student","undergrad","graduate","university","college","school"] },
  { id: "founder",     label: "Founders",    match: ["founder","cofounder","startup","entrepreneur","ceo"] },
  { id: "london",      label: "London",      match: ["london","uk","britain","england"] },
  { id: "berlin",      label: "Berlin",      match: ["berlin","germany","deutschland"] },
  { id: "istanbul",    label: "Istanbul",    match: ["istanbul","turkey","turkiye"] },
  { id: "newyork",     label: "New York",    match: ["new york","nyc"," ny "] },
  { id: "dubai",       label: "Dubai",       match: ["dubai","uae","emirates"] },
  { id: "baku",        label: "Baku",        match: ["baku","azerbaijan"] },
  { id: "paris",       label: "Paris",       match: ["paris","france"] },
  { id: "remote",      label: "Remote",      match: ["remote","wfh","distributed"] },
  { id: "ai",          label: "AI",          match: ["ai","ml","machine learning","gpt","llm","data science"] },
  { id: "product",     label: "Product",     match: ["product","pm","roadmap"] },
  { id: "engineering", label: "Engineering", match: ["engineer","developer","software","code","coding","frontend","backend","fullstack"] },
  { id: "design",      label: "Design",      match: ["design","ux","ui","figma","creative","designer"] },
  { id: "finance",     label: "Finance",     match: ["finance","financial","banker","banking","investment","invest"] },
  { id: "marketing",   label: "Marketing",   match: ["marketing","growth","brand","advertising","ads"] },
  { id: "consulting",  label: "Consulting",  match: ["consulting","consultant","strategy","bain","mckinsey","bcg"] },
  { id: "research",    label: "Research",    match: ["research","phd","academic","scientist","lab"] },
  { id: "medicine",    label: "Medicine",    match: ["medicine","medical","doctor","nurse","health","clinical"] },
  { id: "law",         label: "Law",         match: ["law","legal","lawyer","attorney"] },
  { id: "architecture",label: "Architecture",match: ["architect","architecture"] }
];

const DEFAULT_ORDER = [
  "mentor","student","london","remote","ai","product","engineering","design"
];

function scoreFrom(haystack, matches) {
  let score = 0;
  for (const m of matches) {
    if (haystack.includes(m)) score += 1;
  }
  return score;
}

export function pickPersonalizedTopics(user, docClicks) {
  const scores = new Map();

  /* ─ Profile signals ─ */
  if (user) {
    const parts = [
      user.userType,
      user.headline,
      user.currentRegion,
      user.locationNow?.country,
      user.locationNow?.city,
      ...(Array.isArray(user.skills) ? user.skills : []),
      ...(Array.isArray(user.education)
        ? user.education.flatMap(e => [e?.institution, e?.field, e?.degree])
        : []),
      ...(Array.isArray(user.experience)
        ? user.experience.flatMap(e => [e?.company, e?.org, e?.title, e?.role])
        : [])
    ].filter(Boolean).join(" ").toLowerCase();

    TOPIC_CATALOG.forEach(t => {
      const s = scoreFrom(parts, t.match);
      if (s > 0) scores.set(t.id, (scores.get(t.id) || 0) + s * 3);
    });
  }

  /* ─ Click history signals ─
     docClicks is a map of resultId → count. We can't tell the topic
     from an id alone, but recent activity still indicates engagement,
     so bump popular-in-general topics slightly when the user has
     clicked things (keeps chips fresh vs. static defaults). */
  const totalClicks = docClicks
    ? Object.values(docClicks).reduce((a, b) => a + (b || 0), 0)
    : 0;
  if (totalClicks > 0) {
    DEFAULT_ORDER.forEach(id => {
      scores.set(id, (scores.get(id) || 0) + 1);
    });
  }

  /* ─ Rank and pad with defaults ─ */
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const final = [...ranked];
  for (const id of DEFAULT_ORDER) {
    if (final.length >= 8) break;
    if (!final.includes(id)) final.push(id);
  }

  return final
    .slice(0, 8)
    .map(id => TOPIC_CATALOG.find(t => t.id === id))
    .filter(Boolean)
    .map(t => ({ id: t.id, label: t.label }));
}
