const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const QBlock = require("../models/QBlock");
const QReport = require("../models/QReport");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString } = require("../middleware/sanitize");

// POST /block/:userId — block a user
router.post("/block/:userId", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    await QBlock.findOneAndUpdate(
      { blocker: req.user._id, blocked: userId },
      { blocker: req.user._id, blocked: userId },
      { upsert: true, new: true }
    );

    res.json({ message: "User blocked" });
  } catch (err) {
    console.error("POST /block/:userId error:", err);
    res.status(500).json({ message: "Failed to block user" });
  }
});

// DELETE /block/:userId — unblock a user
router.delete("/block/:userId", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    await QBlock.findOneAndDelete({ blocker: req.user._id, blocked: userId });

    res.json({ message: "User unblocked" });
  } catch (err) {
    console.error("DELETE /block/:userId error:", err);
    res.status(500).json({ message: "Failed to unblock user" });
  }
});

// POST /report — create a report
router.post("/report", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: "targetType, targetId, and reason are required" });
    }

    if (!["post", "comment", "user"].includes(targetType)) {
      return res.status(400).json({ message: "Invalid targetType" });
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "Invalid targetId" });
    }

    const report = await QReport.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason: sanitizeString(reason),
      details: details ? sanitizeString(details) : undefined,
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("POST /report error:", err);
    res.status(500).json({ message: "Failed to create report" });
  }
});

// GET /blocks — list blocked user IDs
router.get("/blocks", authMiddleware, async (req, res) => {
  try {
    const blocks = await QBlock.find({ blocker: req.user._id }).select("blocked");
    const blockedIds = blocks.map((b) => b.blocked);

    res.json(blockedIds);
  } catch (err) {
    console.error("GET /blocks error:", err);
    res.status(500).json({ message: "Failed to fetch blocks" });
  }
});

module.exports = router;
