export const resolvePostLoginPath = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canAdmin = user?.isAdmin || roles.some((role) => ["staffC", "staffB", "adminA"].includes(role));
  return canAdmin ? "/admin" : "/fyp";
};
