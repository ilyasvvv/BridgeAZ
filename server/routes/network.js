const express = require("express");
const Connection = require("../models/Connection");
const Mentorship = require("../models/Mentorship");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.get("/me/connections", authMiddleware, blockBanned, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ requesterId: req.user._id }, { addresseeId: req.user._id }]
    }).populate("requesterId addresseeId", "name profilePhotoUrl currentRegion");
    res.json(connections);
  } catch (error) {
    res.status(500).json({ message: "Failed to load connections" });
  }
});

router.get("/me/mentorships", authMiddleware, blockBanned, async (req, res) => {
  try {
    const mentorships = await Mentorship.find({
      $or: [{ mentorId: req.user._id }, { menteeId: req.user._id }],
      status: "active"
    }).populate("mentorId menteeId", "name profilePhotoUrl currentRegion");
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: "Failed to load mentorships" });
  }
});

router.post("/connections/request", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { recipientId } = req.body || {};
    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }

    const connection = await Connection.create({
      requesterId: req.user._id,
      addresseeId: recipientId,
      status: "pending"
    });
    res.status(201).json(connection);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Connection already exists" });
    }
    res.status(500).json({ message: "Failed to request connection" });
  }
});

router.post("/connections/:id/accept", authMiddleware, blockBanned, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      addresseeId: req.user._id
    });
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    connection.status = "accepted";
    await connection.save();
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept connection" });
  }
});

router.post("/mentorships/request", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { mentorId } = req.body || {};
    if (!mentorId) {
      return res.status(400).json({ message: "mentorId is required" });
    }

    const mentorship = await Mentorship.create({
      mentorId,
      menteeId: req.user._id,
      status: "active"
    });
    res.status(201).json(mentorship);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Mentorship already exists" });
    }
    res.status(500).json({ message: "Failed to request mentorship" });
  }
});

router.post("/mentorships/:id/end", authMiddleware, blockBanned, async (req, res) => {
  try {
    const mentorship = await Mentorship.findOne({
      _id: req.params.id,
      $or: [{ mentorId: req.user._id }, { menteeId: req.user._id }]
    });
    if (!mentorship) {
      return res.status(404).json({ message: "Mentorship not found" });
    }

    mentorship.status = "ended";
    await mentorship.save();
    res.json(mentorship);
  } catch (error) {
    res.status(500).json({ message: "Failed to end mentorship" });
  }
});

module.exports = router;
