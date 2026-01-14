const express = require("express");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.post("/student", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { documentUrl } = req.body;
    // TODO: Add OCR-based document checks to speed up verification review.

    const request = await VerificationRequest.create({
      user: req.user._id,
      requestType: "student",
      documentUrl,
      status: "pending"
    });

    await User.findByIdAndUpdate(req.user._id, { verificationStatus: "pending" });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit verification" });
  }
});

router.post("/mentor", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { documentUrl, universityEmail, linkedinUrl, note } = req.body;

    const request = await VerificationRequest.create({
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

    await User.findByIdAndUpdate(req.user._id, {
      verificationStatus: "pending",
      isMentor: true
    });

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
