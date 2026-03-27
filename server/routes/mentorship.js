const express = require("express");
const MentorshipRequest = require("../models/MentorshipRequest");
const Mentorship = require("../models/Mentorship");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString, FIELD_LIMITS } = require("../middleware/sanitize");

const router = express.Router();

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (req.user.userType !== "student") {
      return res.status(403).json({ message: "Only students can request mentorship" });
    }

    const { toMentor, message } = req.body;
    if (!toMentor) {
      return res.status(400).json({ message: "toMentor is required" });
    }

    // Block self-mentorship
    if (req.user._id.equals(toMentor)) {
      return res.status(400).json({ message: "You cannot request mentorship from yourself" });
    }

    // Check for existing pending request to same mentor
    const existingRequest = await MentorshipRequest.findOne({
      fromStudent: req.user._id,
      toMentor,
      status: "pending"
    });
    if (existingRequest) {
      return res.status(409).json({ message: "You already have a pending request to this mentor" });
    }

    const sanitizedMessage = message ? sanitizeString(message, FIELD_LIMITS.message) : undefined;
    const request = await MentorshipRequest.create({
      fromStudent: req.user._id,
      toMentor,
      message: sanitizedMessage
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
      toMentor: req.user._id,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found or already responded" });
    }

    request.status = status;
    await request.save();

    // On accept: create an active Mentorship record
    if (status === "accepted") {
      const existingMentorship = await Mentorship.findOne({
        mentorId: req.user._id,
        menteeId: request.fromStudent
      });
      if (!existingMentorship) {
        await Mentorship.create({
          mentorId: req.user._id,
          menteeId: request.fromStudent,
          status: "active"
        });
      }

      // Notify the student
      await Notification.create({
        userId: request.fromStudent,
        actorId: req.user._id,
        type: "mentorship",
        title: "Mentorship request accepted",
        body: `${req.user.name} accepted your mentorship request.`,
        metadata: { mentorshipRequestId: request._id }
      });
    } else {
      // Notify on decline too
      await Notification.create({
        userId: request.fromStudent,
        actorId: req.user._id,
        type: "mentorship",
        title: "Mentorship request declined",
        body: `${req.user.name} declined your mentorship request.`,
        metadata: { mentorshipRequestId: request._id }
      });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to respond" });
  }
});

module.exports = router;
