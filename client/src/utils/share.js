const getValue = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const firstNonEmpty = (...values) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) || "";

export const resolveUserCountry = (user) =>
  firstNonEmpty(user?.country, user?.locationNow?.country, user?.currentRegion);

export const resolveUserUniversity = (user) =>
  firstNonEmpty(user?.university, user?.education?.[0]?.institution);

export const resolveUserCompany = (user) =>
  firstNonEmpty(user?.company, user?.experience?.[0]?.company, user?.experience?.[0]?.org);

export const buildSharePayload = ({ entityType, entityId, url, title, subtitle, imageUrl, meta }) => ({
  entityType,
  entityId: String(entityId),
  url,
  title: title || "Shared item",
  subtitle: subtitle || "",
  imageUrl: imageUrl || "",
  meta: meta && typeof meta === "object" ? meta : {}
});

export const rankUsers = ({
  currentUser,
  candidates,
  connectionIds,
  mentorshipIds
}) => {
  const meUniversity = getValue(resolveUserUniversity(currentUser));
  const meCompany = getValue(resolveUserCompany(currentUser));
  const meCountry = getValue(resolveUserCountry(currentUser));

  const scoreForUser = (candidate) => {
    const id = String(candidate?._id || "");
    if (connectionIds.has(id)) return 1;
    if (mentorshipIds.has(id)) return 2;

    const candidateUniversity = getValue(resolveUserUniversity(candidate));
    if (meUniversity && candidateUniversity && meUniversity === candidateUniversity) return 3;

    const candidateCompany = getValue(resolveUserCompany(candidate));
    if (meCompany && candidateCompany && meCompany === candidateCompany) return 4;

    const candidateCountry = getValue(resolveUserCountry(candidate));
    if (meCountry && candidateCountry && meCountry === candidateCountry) return 5;

    return 6;
  };

  return [...(candidates || [])]
    .sort((a, b) => {
      const scoreA = scoreForUser(a);
      const scoreB = scoreForUser(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a?.name || "").localeCompare(b?.name || "");
    });
};
