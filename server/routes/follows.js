const express = require("express");
const Follow = require("../models/Follow");
const Connection = require("../models/Connection");
const Mentorship = require("../models/Mentorship");
const MentorshipRequest = require("../models/MentorshipRequest");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const realtime = require("../utils/realtime");

const router = express.Router();

// Follow a user
router.post("/:userId/follow", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user._id.equals(userId)) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const existing = await Follow.findOne({
      followerId: req.user._id,
      followingId: userId
    });
    if (existing) {
      return res.status(409).json({ message: "Already following" });
    }

    await Follow.create({ followerId: req.user._id, followingId: userId });
    const notification = await Notification.findOneAndUpdate(
      {
        type: "follow",
        userId,
        actorId: req.user._id
      },
      {
        $set: {
          type: "follow",
          userId,
          actorId: req.user._id,
          title: `${req.user.name} started following you`,
          body: req.user.headline || req.user.currentRegion || "New follower",
          link: `/user/${req.user.username || req.user._id}`,
          metadata: { actorName: req.user.name },
          read: false
        }
      },
      { upsert: true, new: true }
    );
    realtime.publishToUser(userId, "notification", notification);
    res.status(201).json({ following: true });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Already following" });
    }
    res.status(500).json({ message: "Failed to follow" });
  }
});

// Unfollow a user
router.delete("/:userId/follow", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.params;
    await Follow.deleteOne({ followerId: req.user._id, followingId: userId });
    res.json({ following: false });
  } catch (error) {
    res.status(500).json({ message: "Failed to unfollow" });
  }
});

// Get relationship status with a specific user
router.get("/:userId/relationship", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const [connection, mentorship, follow, mentorshipRequest] = await Promise.all([
      Connection.findOne({
        $or: [
          { requesterId: myId, addresseeId: userId },
          { requesterId: userId, addresseeId: myId }
        ]
      }),
      Mentorship.findOne({
        $or: [
          { mentorId: myId, menteeId: userId },
          { mentorId: userId, menteeId: myId }
        ],
        status: "active"
      }),
      Follow.findOne({ followerId: myId, followingId: userId }),
      MentorshipRequest.findOne({
        $or: [
          { fromStudent: myId, toMentor: userId },
          { fromStudent: userId, toMentor: myId }
        ],
        status: "pending"
      })
    ]);

    const result = {
      bridged: connection?.status === "accepted",
      bridgePending: connection?.status === "pending",
      bridgeDirection: connection
        ? connection.requesterId.equals(myId) ? "sent" : "received"
        : null,
      connectionId: connection?._id || null,
      isMentor: mentorship ? mentorship.mentorId.equals(userId) : false,
      isMentee: mentorship ? mentorship.menteeId.equals(userId) : false,
      mentorshipId: mentorship?._id || null,
      following: !!follow,
      mentorshipRequestPending: !!mentorshipRequest,
      mentorshipRequestDirection: mentorshipRequest
        ? mentorshipRequest.fromStudent.equals(myId) ? "sent" : "received"
        : null,
      mentorshipRequestId: mentorshipRequest?._id || null
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to load relationship" });
  }
});

// Get my followers count and following count
router.get("/me/follow-stats", authMiddleware, blockBanned, async (req, res) => {
  try {
    const [followers, following] = await Promise.all([
      Follow.countDocuments({ followingId: req.user._id }),
      Follow.countDocuments({ followerId: req.user._id })
    ]);
    res.json({ followers, following });
  } catch (error) {
    res.status(500).json({ message: "Failed to load follow stats" });
  }
});

module.exports = router;
