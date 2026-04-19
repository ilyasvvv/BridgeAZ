const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const {
  sanitizeString,
  sanitizeStringArray,
  sanitizeEducationArray,
  sanitizeExperienceArray,
  sanitizeProjectsArray,
  FIELD_LIMITS
} = require("../middleware/sanitize");

const router = express.Router();

const normalizeUsername = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "");

router.get("/me", authMiddleware, blockBanned, async (req, res) => {
  res.json(req.user);
});

router.put("/me", authMiddleware, blockBanned, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "username",
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

    // Sanitize string fields
    if (updates.name !== undefined) updates.name = sanitizeString(updates.name, FIELD_LIMITS.name);
    if (updates.username !== undefined) updates.username = normalizeUsername(updates.username);
    if (updates.headline !== undefined) updates.headline = sanitizeString(updates.headline, FIELD_LIMITS.headline);
    if (updates.bio !== undefined) updates.bio = sanitizeString(updates.bio, FIELD_LIMITS.bio);
    if (updates.currentRegion !== undefined) updates.currentRegion = sanitizeString(updates.currentRegion, 100);

    // Validate name is not empty after sanitization
    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (updates.username !== undefined && (updates.username.length < 3 || updates.username.length > 24)) {
      return res.status(400).json({ message: "Username must be 3-24 characters" });
    }

    // Sanitize arrays
    if (updates.skills !== undefined) updates.skills = sanitizeStringArray(updates.skills, FIELD_LIMITS.skill, 50);
    if (updates.education !== undefined) updates.education = sanitizeEducationArray(updates.education);
    if (updates.experience !== undefined) updates.experience = sanitizeExperienceArray(updates.experience);
    if (updates.projects !== undefined) updates.projects = sanitizeProjectsArray(updates.projects);

    if (updates.isPrivate !== undefined) {
      updates.profileVisibility = updates.isPrivate ? "private" : "public";
    }

    if (updates.username) {
      const existingUsername = await User.findOne({
        _id: { $ne: req.user._id },
        username: updates.username
      }).select("_id");

      if (existingUsername) {
        return res.status(409).json({ message: "Username already taken" });
      }
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
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escapedQ, $options: "i" };
      query.$or = [
        { name: regex },
        { username: regex },
        { headline: regex },
        { skills: regex },
        { "education.institution": regex },
        { "education.fieldOfStudy": regex },
        { "experience.company": regex },
        { "experience.org": regex },
        { "experience.title": regex }
      ];
    }

    const users = await User.find(query)
      .select("name username accountType avatarUrl profilePhotoUrl profilePictureUrl currentRegion locationNow education experience headline")
      .sort({ updatedAt: -1 })
      .limit(limit);

    const payload = users.map((member) => {
      const firstEducation = Array.isArray(member.education) ? member.education[0] : null;
      const firstExperience = Array.isArray(member.experience) ? member.experience[0] : null;
      const company = firstExperience?.company || firstExperience?.org || "";
      return {
        _id: member._id,
        name: member.name,
        username: member.username || "",
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
      "name username accountType currentRegion profilePhotoUrl avatarUrl headline bio education experience skills links socialLinks createdAt isMentor mentorshipAvailability"
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

    // Hide email from non-owner, non-admin views
    const userObj = user.toObject();
    if (!isOwner && !isAdmin) {
      delete userObj.email;
    }
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { region, accountType, isMentor } = req.query;
    const query = {};

    if (region) query.currentRegion = region;
    if (accountType) query.accountType = accountType;
    if (isMentor !== undefined) query.isMentor = isMentor === "true";

    const users = await User.find(query).select("-passwordHash").limit(100);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

module.exports = router;
