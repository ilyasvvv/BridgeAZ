const express = require("express");
const Connection = require("../models/Connection");
const Mentorship = require("../models/Mentorship");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const realtime = require("../utils/realtime");

const router = express.Router();

const POPULATE_FIELDS = "name profilePhotoUrl avatarUrl currentRegion headline accountType isMentor mentorshipAvailability";

router.get("/me/connections", authMiddleware, blockBanned, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ requesterId: req.user._id }, { addresseeId: req.user._id }]
    }).populate("requesterId addresseeId", POPULATE_FIELDS);
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
    }).populate("mentorId menteeId", POPULATE_FIELDS);
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: "Failed to load mentorships" });
  }
});

router.post("/connections/request", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { recipientId, message } = req.body || {};
    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }

    if (req.user._id.equals(recipientId)) {
      return res.status(400).json({ message: "You cannot bridge with yourself" });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        { requesterId: req.user._id, addresseeId: recipientId },
        { requesterId: recipientId, addresseeId: req.user._id }
      ]
    });
    if (existingConnection) {
      return res.status(409).json({ message: "Bridge already exists" });
    }

    const connectionData = {
      requesterId: req.user._id,
      addresseeId: recipientId,
      status: "pending"
    };
    if (message && typeof message === "string") {
      connectionData.message = message.slice(0, 500);
    }

    const connection = await Connection.create(connectionData);
    const notification = await Notification.findOneAndUpdate(
      {
        type: "bridge_request",
        userId: recipientId,
        actorId: req.user._id,
        "metadata.connectionId": connection._id
      },
      {
        $set: {
          type: "bridge_request",
          userId: recipientId,
          actorId: req.user._id,
          title: `${req.user.name} sent you a bridge request`,
          body: connection.message || req.user.headline || "Accept to connect.",
          link: `/network?connection=${connection._id}`,
          metadata: { connectionId: connection._id, actorName: req.user.name },
          read: false
        }
      },
      { upsert: true, new: true }
    );
    realtime.publishToUser(recipientId, "notification", notification);
    res.status(201).json(connection);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Bridge already exists" });
    }
    res.status(500).json({ message: "Failed to send bridge request" });
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
    connection.acceptedAt = new Date();
    await connection.save();
    const requesterId = connection.requesterId;
    const notification = await Notification.findOneAndUpdate(
      {
        type: "bridge_accepted",
        userId: requesterId,
        actorId: req.user._id,
        "metadata.connectionId": connection._id
      },
      {
        $set: {
          type: "bridge_accepted",
          userId: requesterId,
          actorId: req.user._id,
          title: `${req.user.name} accepted your bridge request`,
          body: "You are now connected.",
          link: `/network?connection=${connection._id}`,
          metadata: { connectionId: connection._id, actorName: req.user.name },
          read: false
        }
      },
      { upsert: true, new: true }
    );
    realtime.publishToUser(requesterId, "notification", notification);
    realtime.publishToUsers([requesterId, req.user._id], "network:connection_updated", connection);
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept bridge request" });
  }
});

router.post("/connections/:id/reject", authMiddleware, blockBanned, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      addresseeId: req.user._id,
      status: "pending"
    });
    if (!connection) {
      return res.status(404).json({ message: "Request not found" });
    }

    connection.status = "rejected";
    await connection.save();
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject bridge request" });
  }
});

router.delete("/connections/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      $or: [{ requesterId: req.user._id }, { addresseeId: req.user._id }]
    });
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    await Connection.deleteOne({ _id: connection._id });
    res.json({ removed: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove bridge" });
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
