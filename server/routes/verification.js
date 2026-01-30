const express = require("express");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { syncVerificationStatus } = require("../utils/verification");

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

router.post("/student", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { documentUrl } = req.body || {};
    const validation = validateDocumentUrl(documentUrl);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
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
        status: "pending"
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
    const { documentUrl, universityEmail, linkedinUrl, note } = req.body || {};
    const validation = validateDocumentUrl(documentUrl);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }
    if (!universityEmail && !linkedinUrl && !note) {
      return res
        .status(400)
        .json({ message: "Provide at least one mentor detail." });
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
        }
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

router.get("/my-requests", authMiddleware, blockBanned, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load requests" });
  }
});

module.exports = router;
