const express = require("express");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Notification = require("../models/Notification");
const { authMiddleware, requireAdmin, requireRole } = require("../middleware/auth");

const router = express.Router();

// TODO: Add pagination + audit logs + rate limiting before production use.
router.get("/users", authMiddleware, requireRole("A"), async (req, res) => {
  try {
    const { region, accountType, banned, search } = req.query;
    const query = {};

    if (region) query.currentRegion = region;
    if (accountType) query.accountType = accountType;
    if (banned !== undefined && banned !== "") query.banned = banned === "true";

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { username: searchRegex }];
    }

    const users = await User.find(query)
      .select("name email username accountType currentRegion banned bannedReason bannedAt isAdmin roles createdAt")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

const respondUser = (res, target) =>
  res.json({
    _id: target._id,
    name: target.name,
    email: target.email,
    username: target.username,
    accountType: target.accountType,
    currentRegion: target.currentRegion,
    banned: target.banned,
    bannedReason: target.bannedReason,
    bannedAt: target.bannedAt,
    roles: target.roles || []
  });

router.patch("/users/:id/ban", authMiddleware, requireRole("A"), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }
    if (target.isAdmin || (target.roles || []).includes("adminA")) {
      return res.status(400).json({ message: "Admin accounts cannot be banned." });
    }

    target.banned = true;
    target.bannedReason = req.body.reason || "";
    target.bannedAt = new Date();
    await target.save();

    respondUser(res, target);
  } catch (error) {
    res.status(500).json({ message: "Failed to ban user" });
  }
});

router.patch("/users/:id/unban", authMiddleware, requireRole("A"), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    target.banned = false;
    target.bannedReason = "";
    target.bannedAt = null;
    await target.save();

    respondUser(res, target);
  } catch (error) {
    res.status(500).json({ message: "Failed to unban user" });
  }
});

router.patch("/users/:id/roles", authMiddleware, requireRole("A"), async (req, res) => {
  try {
    const { roles } = req.body || {};
    if (!Array.isArray(roles)) {
      return res.status(400).json({ message: "roles must be an array" });
    }

    const target = await User.findByIdAndUpdate(req.params.id, { roles }, { new: true });
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }
    respondUser(res, target);
  } catch (error) {
    res.status(500).json({ message: "Failed to update roles" });
  }
});

// Legacy endpoints
router.post("/users/:id/ban", authMiddleware, requireAdmin, (req, res) =>
  router.handle({ ...req, method: "PATCH", url: `/users/${req.params.id}/ban` }, res)
);
router.post("/users/:id/unban", authMiddleware, requireAdmin, (req, res) =>
  router.handle({ ...req, method: "PATCH", url: `/users/${req.params.id}/unban` }, res)
);

const verificationDisabled = (req, res) =>
  res.status(410).json({ message: "Verification is no longer available." });

router.get("/verifications", authMiddleware, requireRole("B"), verificationDisabled);
router.patch("/verifications/:id/approve", authMiddleware, requireRole("B"), verificationDisabled);
router.patch("/verifications/:id/reject", authMiddleware, requireRole("B"), verificationDisabled);
router.get("/verification-requests", authMiddleware, requireRole("B"), verificationDisabled);
router.post("/verification-requests/:id/approve", authMiddleware, requireRole("B"), verificationDisabled);
router.post("/verification-requests/:id/reject", authMiddleware, requireRole("B"), verificationDisabled);

router.delete("/opportunities/:id", authMiddleware, requireRole("C"), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    await Opportunity.deleteOne({ _id: req.params.id });
    await Notification.create({
      userId: opportunity.postedBy,
      type: "opportunity",
      title: "Opportunity removed",
      body: "An admin removed your opportunity posting.",
      metadata: { opportunityId: opportunity._id }
    });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete opportunity" });
  }
});

module.exports = router;
