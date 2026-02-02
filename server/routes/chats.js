const express = require("express");
const ChatThread = require("../models/ChatThread");
const ChatMessage = require("../models/ChatMessage");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.get("/threads", authMiddleware, blockBanned, async (req, res) => {
  try {
    const threads = await ChatThread.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100);
    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: "Failed to load threads" });
  }
});

router.post("/threads", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const existing = await ChatThread.findOne({
      participants: { $all: [req.user._id, userId] }
    });
    if (existing) {
      return res.json(existing);
    }

    const thread = await ChatThread.create({
      participants: [req.user._id, userId],
      lastMessageAt: new Date()
    });
    res.status(201).json(thread);
  } catch (error) {
    res.status(500).json({ message: "Failed to create thread" });
  }
});

router.get("/threads/:id/messages", authMiddleware, blockBanned, async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const messages = await ChatMessage.find({ threadId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(200);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

router.post("/threads/:id/messages", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body) {
      return res.status(400).json({ message: "Message body is required" });
    }

    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const message = await ChatMessage.create({
      threadId: req.params.id,
      senderId: req.user._id,
      body
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;
