const express = require("express");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { authMiddleware, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// TODO: Add pagination + audit logs + rate limiting before production use.
router.get("/users", authMiddleware, requireAdmin, async (req, res) => {
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
        "name email userType currentRegion verificationStatus banned bannedReason bannedAt isAdmin createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

router.post("/users/:id/ban", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }
    if (target.isAdmin) {
      return res.status(400).json({ message: "Admin accounts cannot be banned." });
    }

    target.banned = true;
    target.bannedReason = req.body.reason || "";
    target.bannedAt = new Date();
    await target.save();

    res.json({
      _id: target._id,
      name: target.name,
      email: target.email,
      userType: target.userType,
      currentRegion: target.currentRegion,
      verificationStatus: target.verificationStatus,
      banned: target.banned,
      bannedReason: target.bannedReason,
      bannedAt: target.bannedAt
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to ban user" });
  }
});

router.post("/users/:id/unban", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    target.banned = false;
    target.bannedReason = "";
    target.bannedAt = null;
    await target.save();

    res.json({
      _id: target._id,
      name: target.name,
      email: target.email,
      userType: target.userType,
      currentRegion: target.currentRegion,
      verificationStatus: target.verificationStatus,
      banned: target.banned,
      bannedReason: target.bannedReason,
      bannedAt: target.bannedAt
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to unban user" });
  }
});

router.get("/verification-requests", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const requests = await VerificationRequest.find({ status })
      .populate("user", "name userType currentRegion email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load verification requests" });
  }
});

router.post("/verification-requests/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "approved";
    request.adminReviewer = req.user._id;
    request.adminComment = req.body.adminComment || "";
    await request.save();

    const updates = { verificationStatus: "verified" };
    if (request.requestType === "student") {
      updates.studentVerified = true;
    } else if (request.requestType === "mentor") {
      updates.isMentor = true;
      updates.mentorVerified = true;
    }

    await User.findByIdAndUpdate(request.user, updates);

    res.json({ message: "Approved" });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve" });
  }
});

router.post("/verification-requests/:id/reject", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";
    request.adminReviewer = req.user._id;
    request.adminComment = req.body.adminComment || "";
    await request.save();

    const updates = {
      verificationStatus: "rejected",
      studentVerified: false,
      mentorVerified: false
    };

    await User.findByIdAndUpdate(request.user, updates);

    res.json({ message: "Rejected" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject" });
  }
});

module.exports = router;
