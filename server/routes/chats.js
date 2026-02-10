const express = require("express");
const ChatThread = require("../models/ChatThread");
const ChatMessage = require("../models/ChatMessage");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const toThreadPayload = (thread, userId) => {
  const otherParticipant = (thread.participants || []).find(
    (participant) => !participant._id.equals(userId)
  );
  const myReadState = (thread.readStates || []).find((state) =>
    state.userId?.equals(userId)
  );
  const otherReadState = (thread.readStates || []).find(
    (state) => !state.userId?.equals(userId)
  );
  return {
    ...thread.toObject(),
    otherParticipant,
    myLastReadAt: myReadState?.lastReadAt || null,
    otherLastReadAt: otherReadState?.lastReadAt || null
  };
};

router.get("/threads", authMiddleware, blockBanned, async (req, res) => {
  try {
    const threads = await ChatThread.find({ participants: req.user._id })
      .populate("participants", "name profilePhotoUrl userType")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100);
    const mapped = threads.map((thread) => toThreadPayload(thread, req.user._id));
    res.json(mapped);
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
      if (existing.status === "rejected") {
        existing.status = "pending";
        existing.requestedBy = req.user._id;
        existing.acceptedAt = null;
        existing.rejectedAt = null;
        existing.lastMessageAt = new Date();
        await existing.save();
      } else {
        return res.json(existing);
      }
      const populated = await existing.populate("participants", "name profilePhotoUrl userType");
      const payload = toThreadPayload(populated, req.user._id);
      try {
        const recipient = (populated.participants || []).find(
          (participant) => !participant._id.equals(req.user._id)
        );
        if (recipient) {
          await Notification.findOneAndUpdate(
            {
              type: "chat_request",
              userId: recipient._id,
              actorId: req.user._id,
              "metadata.threadId": populated._id
            },
            {
              $set: {
                type: "chat_request",
                userId: recipient._id,
                actorId: req.user._id,
                title: `${req.user.name} wants to message you`,
                body: "Accept to start chatting.",
                link: `/chats?thread=${populated._id}`,
                read: false,
                metadata: { threadId: populated._id, actorName: req.user.name }
              }
            },
            { upsert: true, new: true }
          );
        }
      } catch (notifyError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Chat request notification failed:", notifyError.message || notifyError);
        }
      }
      return res.json(payload);
    }

    const thread = await ChatThread.create({
      participants: [req.user._id, userId],
      status: "pending",
      requestedBy: req.user._id,
      lastMessageAt: new Date()
    });
    const populated = await thread.populate("participants", "name profilePhotoUrl userType");
    const payload = toThreadPayload(populated, req.user._id);
    try {
      const recipient = (populated.participants || []).find(
        (participant) => !participant._id.equals(req.user._id)
      );
      if (recipient) {
        await Notification.findOneAndUpdate(
          {
            type: "chat_request",
            userId: recipient._id,
            actorId: req.user._id,
            "metadata.threadId": populated._id
          },
          {
            $set: {
              type: "chat_request",
              userId: recipient._id,
              actorId: req.user._id,
              title: `${req.user.name} wants to message you`,
              body: "Accept to start chatting.",
              link: `/chats?thread=${populated._id}`,
              read: false,
              metadata: { threadId: populated._id, actorName: req.user.name }
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (notifyError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Chat request notification failed:", notifyError.message || notifyError);
      }
    }
    res.status(201).json(payload);
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
    const {
      body,
      attachments,
      attachmentUrl,
      attachmentContentType,
      attachmentKind,
      attachmentName
    } = req.body || {};
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .map((item) => ({
            url: item?.url,
            contentType: item?.contentType,
            kind: item?.kind,
            name: item?.name
          }))
          .filter((item) => typeof item.url === "string" && item.url.length > 0)
      : [];
    const primaryAttachment = normalizedAttachments[0] || null;
    const resolvedAttachmentUrl = attachmentUrl || primaryAttachment?.url;
    const resolvedAttachmentContentType = attachmentContentType || primaryAttachment?.contentType;
    const resolvedAttachmentKind = attachmentKind || primaryAttachment?.kind;
    const resolvedAttachmentName = attachmentName || primaryAttachment?.name;

    if (!resolvedAttachmentUrl && normalizedAttachments.length === 0 && (!body || !body.trim())) {
      return res.status(400).json({ message: "Message body or attachment is required" });
    }

    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    const status = thread.status || "active";
    if (status === "pending") {
      return res.status(403).json({ message: "Thread is pending approval" });
    }
    if (status === "rejected") {
      return res.status(403).json({ message: "Thread was rejected" });
    }

    const message = await ChatMessage.create({
      threadId: req.params.id,
      senderId: req.user._id,
      body,
      attachments: normalizedAttachments,
      attachmentUrl: resolvedAttachmentUrl,
      attachmentContentType: resolvedAttachmentContentType,
      attachmentKind: resolvedAttachmentKind,
      attachmentName: resolvedAttachmentName
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    try {
      const recipient = (thread.participants || []).find(
        (participant) => !participant.equals(req.user._id)
      );
      if (recipient && !recipient.equals(req.user._id)) {
        await Notification.findOneAndUpdate(
          {
            type: "chat_message",
            userId: recipient,
            actorId: req.user._id,
            "metadata.threadId": thread._id
          },
          {
            $set: {
              type: "chat_message",
              userId: recipient,
              actorId: req.user._id,
              title: `${req.user.name} messaged you`,
              body: (message.body || "Sent an attachment").slice(0, 140),
              link: `/chats?thread=${thread._id}`,
              read: false,
              metadata: { threadId: thread._id, actorName: req.user.name }
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (notifyError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Chat notification failed:", notifyError.message || notifyError);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

router.post("/threads/:id/read", authMiddleware, blockBanned, async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const now = new Date();
    const existing = (thread.readStates || []).find((state) =>
      state.userId?.equals(req.user._id)
    );
    if (existing) {
      existing.lastReadAt = now;
    } else {
      thread.readStates = [...(thread.readStates || []), { userId: req.user._id, lastReadAt: now }];
    }

    await thread.save();
    res.json({ ok: true, threadId: thread._id, lastReadAt: now });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark thread as read" });
  }
});

router.post("/threads/:id/accept", authMiddleware, blockBanned, async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    }).populate("participants", "name profilePhotoUrl userType");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    if (thread.status !== "pending") {
      return res.status(400).json({ message: "Thread is not pending" });
    }
    if (thread.requestedBy && thread.requestedBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    thread.status = "active";
    thread.acceptedAt = new Date();
    thread.rejectedAt = null;
    await thread.save();
    const payload = toThreadPayload(thread, req.user._id);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept request" });
  }
});

router.post("/threads/:id/reject", authMiddleware, blockBanned, async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    }).populate("participants", "name profilePhotoUrl userType");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    if (thread.status !== "pending") {
      return res.status(400).json({ message: "Thread is not pending" });
    }
    if (thread.requestedBy && thread.requestedBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    thread.status = "rejected";
    thread.rejectedAt = new Date();
    await thread.save();
    const payload = toThreadPayload(thread, req.user._id);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject request" });
  }
});

module.exports = router;
