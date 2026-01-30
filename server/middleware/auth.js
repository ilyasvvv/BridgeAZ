const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select("-passwordHash");
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const blockBanned = (req, res, next) => {
  if (req.user?.banned) {
    return res.status(403).json({ message: "Your account has been banned." });
  }
  next();
};

const staffRank = {
  staffC: 1,
  staffB: 2,
  adminA: 3
};

const hasRole = (user, role) => {
  if (!user) return false;
  if (user.isAdmin) return true;

  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.includes("adminA")) return true;

  if (staffRank[role]) {
    const highestRank = roles.reduce((maxRank, candidate) => {
      const rank = staffRank[candidate] || 0;
      return Math.max(maxRank, rank);
    }, 0);
    return highestRank >= staffRank[role];
  }

  return roles.includes(role);
};

const requireRoleAny = (roles = []) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Missing user context" });
  }
  if (!roles.length) {
    return res.status(403).json({ message: "Access denied" });
  }

  const allowed = roles.some((role) => hasRole(req.user, role));
  if (!allowed) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const roleMap = {
  A: "adminA",
  B: "staffB",
  C: "staffC"
};

const requireRole = (level) => (req, res, next) => {
  const mapped = roleMap[level] || level;
  if (!hasRole(req.user, mapped)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!hasRole(req.user, "adminA")) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const requireAuth = authMiddleware;

module.exports = {
  authMiddleware,
  requireAuth,
  blockBanned,
  requireAdmin,
  requireRoleAny,
  requireRole
};
