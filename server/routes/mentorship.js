const express = require("express");
const MentorshipRequest = require("../models/MentorshipRequest");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (req.user.userType !== "student") {
      return res.status(403).json({ message: "Only students can request mentorship" });
    }

    const { toMentor, message } = req.body;
    const request = await MentorshipRequest.create({
      fromStudent: req.user._id,
      toMentor,
      message
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to create mentorship request" });
  }
});

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const query = { toMentor: req.user._id };
    const requests = await MentorshipRequest.find(query)
      .populate("fromStudent", "name profilePhotoUrl currentRegion")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load mentorship requests" });
  }
});

router.post("/:id/respond", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await MentorshipRequest.findOne({
      _id: req.params.id,
      toMentor: req.user._id
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to respond" });
  }
});

module.exports = router;
