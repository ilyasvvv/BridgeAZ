const express = require("express");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

router.patch("/:id/read", authMiddleware, blockBanned, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification" });
  }
});

module.exports = router;
