const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const QPost = require("../models/QPost");
const QBlock = require("../models/QBlock");
const { authMiddleware } = require("../middleware/auth");

// GET /:userId — public profile for Qovshaq
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(userId).select(
      "name avatarUrl profilePhotoUrl profilePictureUrl currentRegion userType headline bio qLocation qInterests qOnboarded"
    ).lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    const [postCount, block] = await Promise.all([
      QPost.countDocuments({ author: userId, status: "active" }),
      QBlock.findOne({ blocker: req.user._id, blocked: userId }),
    ]);

    res.json({
      ...user,
      postCount,
      isBlocked: !!block,
    });
  } catch (err) {
    console.error("GET /api/q/profile/:userId error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
