const express = require("express");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.get("/me", authMiddleware, blockBanned, async (req, res) => {
  res.json(req.user);
});

router.put("/me", authMiddleware, blockBanned, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "headline",
      "bio",
      "currentRegion",
      "profilePhotoUrl",
      "skills",
      "links",
      "education",
      "experience",
      "projects",
      "isMentor"
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true
    }).select("-passwordHash");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
});

router.get("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { region, userType, isMentor } = req.query;
    const query = {};

    if (region) query.currentRegion = region;
    if (userType) query.userType = userType;
    if (isMentor !== undefined) query.isMentor = isMentor === "true";

    const users = await User.find(query).select("-passwordHash").limit(100);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

module.exports = router;
