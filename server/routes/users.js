const express = require("express");
const mongoose = require("mongoose");
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
      "profileVisibility",
      "isPrivate",
      "profilePictureUrl",
      "profilePhotoUrl",
      "avatarUrl",
      "resumeUrl",
      "skills",
      "links",
      "socialLinks",
      "education",
      "experience",
      "projects",
      "isMentor",
      "locationNow",
      "mentorshipAvailability"
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.isPrivate !== undefined) {
      updates.profileVisibility = updates.isPrivate ? "private" : "public";
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true
    }).select("-passwordHash");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
});

router.get("/search", authMiddleware, blockBanned, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 30;
    const query = { _id: { $ne: req.user._id } };

    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    const users = await User.find(query)
      .select(
        "name avatarUrl profilePhotoUrl profilePictureUrl currentRegion locationNow education experience"
      )
      .sort({ updatedAt: -1 })
      .limit(limit);

    const payload = users.map((member) => {
      const firstEducation = Array.isArray(member.education) ? member.education[0] : null;
      const firstExperience = Array.isArray(member.experience) ? member.experience[0] : null;
      const company = firstExperience?.company || firstExperience?.org || "";
      return {
        _id: member._id,
        name: member.name,
        username: null,
        avatarUrl: member.avatarUrl || member.profilePhotoUrl || member.profilePictureUrl || "",
        profilePhotoUrl: member.profilePhotoUrl || member.avatarUrl || "",
        profilePictureUrl: member.profilePictureUrl || "",
        country: member.locationNow?.country || member.currentRegion || "",
        university: firstEducation?.institution || "",
        company
      };
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to search users" });
  }
});

router.get("/:id/public", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await User.findById(req.params.id).select(
      "name userType currentRegion profilePhotoUrl avatarUrl headline bio education experience skills links socialLinks createdAt"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.get("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isOwner = user._id.equals(req.user._id);
    const isAdmin = req.user.isAdmin || (req.user.roles || []).includes("adminA");
    const isPrivate = user.isPrivate || user.profileVisibility === "private";
    if (isPrivate && !isOwner && !isAdmin) {
      return res.json({
        _id: user._id,
        name: user.name,
        headline: user.headline,
        profilePhotoUrl: user.profilePhotoUrl || user.avatarUrl,
        currentRegion: user.currentRegion
      });
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
