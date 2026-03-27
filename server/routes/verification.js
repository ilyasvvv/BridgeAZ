const express = require("express");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { syncVerificationStatus, DEFAULT_VERIFICATION_DURATION_MS } = require("../utils/verification");

const router = express.Router();

const getPublicBaseUrl = () => {
  return (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
};

const validateDocumentUrl = (documentUrl) => {
  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    return { ok: false, status: 500, message: "Upload storage not configured" };
  }
  if (!documentUrl || typeof documentUrl !== "string") {
    return { ok: false, status: 400, message: "documentUrl is required" };
  }
  const isR2Url = documentUrl.startsWith(`${baseUrl}/`);
  const isHttps = documentUrl.startsWith("https://");
  if (!isR2Url && !isHttps) {
    return { ok: false, status: 400, message: "Invalid documentUrl" };
  }
  return { ok: true };
};

const computeExpiresAt = (expiresAt) => {
  if (expiresAt) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime()) || date <= new Date()) return null;
    return date;
  }
  return null;
};

router.post("/student", authMiddleware, blockBanned, async (req, res) => {
  try {
    // Only students can submit student verification
    if (req.user.userType !== "student") {
      return res.status(403).json({ message: "Only students can submit student verification" });
    }

    const { documentUrl, expiresAt } = req.body || {};
    const validation = validateDocumentUrl(documentUrl);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const user = await User.findById(req.user._id).select("studentVerified studentVerificationExpiresAt");
    if (user.studentVerified) {
      const now = new Date();
      if (!user.studentVerificationExpiresAt || user.studentVerificationExpiresAt > now) {
        return res.status(409).json({ message: "You are already verified as a student." });
      }
    }

    const existing = await VerificationRequest.findOne({
      user: req.user._id,
      status: "pending"
    }).select("_id");
    if (existing) {
      return res
        .status(409)
        .json({ message: "You already have a pending verification request." });
    }

    let request;
    try {
      request = await VerificationRequest.create({
        user: req.user._id,
        requestType: "student",
        documentUrl,
        status: "pending",
        expiresAt: computeExpiresAt(expiresAt)
      });
    } catch (error) {
      if (error && error.code === 11000) {
        return res
          .status(409)
          .json({ message: "You already have a pending verification request." });
      }
      throw error;
    }

    await syncVerificationStatus(req.user._id);
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit verification" });
  }
});

router.post("/mentor", authMiddleware, blockBanned, async (req, res) => {
  try {
    // Only professionals can submit mentor verification
    if (req.user.userType !== "professional") {
      return res.status(403).json({ message: "Only professionals can submit mentor verification" });
    }

    const { documentUrl, universityEmail, linkedinUrl, note, expiresAt } = req.body || {};
    const validation = validateDocumentUrl(documentUrl);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }
    if (!universityEmail && !linkedinUrl && !note) {
      return res
        .status(400)
        .json({ message: "Provide at least one mentor detail." });
    }

    const user = await User.findById(req.user._id).select("mentorVerified mentorVerificationExpiresAt");
    if (user.mentorVerified) {
      const now = new Date();
      if (!user.mentorVerificationExpiresAt || user.mentorVerificationExpiresAt > now) {
        return res.status(409).json({ message: "You are already verified as a mentor." });
      }
    }

    const existing = await VerificationRequest.findOne({
      user: req.user._id,
      status: "pending"
    }).select("_id");
    if (existing) {
      return res
        .status(409)
        .json({ message: "You already have a pending verification request." });
    }

    let request;
    try {
      request = await VerificationRequest.create({
        user: req.user._id,
        requestType: "mentor",
        documentUrl,
        status: "pending",
        metadata: {
          universityEmail,
          linkedinUrl,
          note
        },
        expiresAt: computeExpiresAt(expiresAt)
      });
    } catch (error) {
      if (error && error.code === 11000) {
        return res
          .status(409)
          .json({ message: "You already have a pending verification request." });
      }
      throw error;
    }

    await User.findByIdAndUpdate(req.user._id, { isMentor: true });
    await syncVerificationStatus(req.user._id);
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit mentor verification" });
  }
});

// Terminate an active verification early (user-initiated)
router.post("/terminate", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { type } = req.body || {};
    if (!["student", "mentor"].includes(type)) {
      return res.status(400).json({ message: "type must be 'student' or 'mentor'" });
    }

    const latestRequest = await VerificationRequest.findOne({
      user: req.user._id,
      requestType: type,
      status: "approved"
    }).sort({ createdAt: -1 });

    if (!latestRequest) {
      return res.status(404).json({ message: `No active ${type} verification found.` });
    }

    // Set expiry to now to terminate immediately
    latestRequest.expiresAt = new Date();
    await latestRequest.save();

    await syncVerificationStatus(req.user._id);
    res.json({ message: `${type} verification terminated.` });
  } catch (error) {
    res.status(500).json({ message: "Failed to terminate verification" });
  }
});

router.get("/my-requests", authMiddleware, blockBanned, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load requests" });
  }
});

module.exports = router;
