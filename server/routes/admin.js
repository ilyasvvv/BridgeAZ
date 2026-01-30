const express = require("express");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Notification = require("../models/Notification");
const { authMiddleware, requireAdmin, requireRoleAny, requireRole } = require("../middleware/auth");
const { syncVerificationStatus } = require("../utils/verification");

const router = express.Router();

// TODO: Add pagination + audit logs + rate limiting before production use.
router.get("/users", authMiddleware, requireRole("A"), async (req, res) => {
  try {
    const { region, userType, verificationStatus, banned, search } = req.query;
    const query = {};

    if (region) query.currentRegion = region;
    if (userType) query.userType = userType;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (banned !== undefined && banned !== "") query.banned = banned === "true";

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(query)
      .select(
        "name email userType currentRegion verificationStatus banned bannedReason bannedAt isAdmin roles createdAt"
      )
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
    userType: target.userType,
    currentRegion: target.currentRegion,
    verificationStatus: target.verificationStatus,
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

    const target = await User.findByIdAndUpdate(
      req.params.id,
      { roles },
      { new: true }
    );
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

router.get(
  "/verifications",
  authMiddleware,
  requireRole("B"),
  async (req, res) => {
    try {
      const status = req.query.status || "pending";
      const requests = await VerificationRequest.find({ status })
        .populate("user", "name userType currentRegion email")
        .sort({ createdAt: -1 });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to load verification requests" });
    }
  }
);

router.patch(
  "/verifications/:id/approve",
  authMiddleware,
  requireRole("B"),
  async (req, res) => {
    try {
      const request = await VerificationRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      request.status = "approved";
      request.adminReviewer = req.user._id;
      request.adminComment = req.body.adminComment || "";
      request.decidedBy = req.user._id;
      request.decisionAt = new Date();
      request.reviewedAt = new Date();
      if (request.adminComment) {
        request.adminNotes = request.adminNotes || [];
        request.adminNotes.push({
          byUserId: req.user._id,
          note: request.adminComment
        });
      }
      await request.save();

      if (request.requestType === "mentor") {
        await User.findByIdAndUpdate(request.user, { isMentor: true });
      }

      await syncVerificationStatus(request.user);

      await Notification.create({
        userId: request.user,
        type: "verification",
        title: "Verification approved",
        body: "Your verification request has been approved.",
        metadata: { requestId: request._id }
      });

      res.json({ message: "Approved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve" });
    }
  }
);

router.patch(
  "/verifications/:id/reject",
  authMiddleware,
  requireRole("B"),
  async (req, res) => {
    try {
      const request = await VerificationRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      request.status = "rejected";
      request.adminReviewer = req.user._id;
      request.adminComment = req.body.adminComment || "";
      request.decidedBy = req.user._id;
      request.decisionAt = new Date();
      request.reviewedAt = new Date();
      if (request.adminComment) {
        request.adminNotes = request.adminNotes || [];
        request.adminNotes.push({
          byUserId: req.user._id,
          note: request.adminComment
        });
      }
      await request.save();

      await syncVerificationStatus(request.user);

      await Notification.create({
        userId: request.user,
        type: "verification",
        title: "Verification rejected",
        body: "Your verification request has been rejected.",
        metadata: { requestId: request._id }
      });

      res.json({ message: "Rejected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject" });
    }
  }
);

// Legacy verification routes
router.get(
  "/verification-requests",
  authMiddleware,
  requireRoleAny(["staffB", "adminA"]),
  async (req, res) => {
    req.url = "/verifications";
    req.method = "GET";
    router.handle(req, res);
  }
);
router.post(
  "/verification-requests/:id/approve",
  authMiddleware,
  requireRoleAny(["staffB", "adminA"]),
  async (req, res) => {
    req.url = `/verifications/${req.params.id}/approve`;
    req.method = "PATCH";
    router.handle(req, res);
  }
);
router.post(
  "/verification-requests/:id/reject",
  authMiddleware,
  requireRoleAny(["staffB", "adminA"]),
  async (req, res) => {
    req.url = `/verifications/${req.params.id}/reject`;
    req.method = "PATCH";
    router.handle(req, res);
  }
);

router.delete(
  "/opportunities/:id",
  authMiddleware,
  requireRole("C"),
  async (req, res) => {
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
  }
);

module.exports = router;
