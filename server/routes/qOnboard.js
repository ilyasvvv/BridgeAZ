const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");

// POST / — onboard user to Qovshaq
router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { location, interests } = req.body;

    if (!location || !location.country) {
      return res.status(400).json({ error: "Location with country is required" });
    }

    const update = {
      qLocation: {
        country: location.country,
        countryCode: location.countryCode,
        city: location.city,
        region: location.region,
        coordinates: location.coordinates,
      },
      qInterests: interests || [],
      qOnboarded: true,
    };

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
    }).select("-passwordHash -passwordResetTokenHash -passwordResetExpiresAt");

    res.json(user);
  } catch (err) {
    console.error("POST /api/q/onboard error:", err);
    res.status(500).json({ error: "Failed to onboard user" });
  }
});

module.exports = router;
