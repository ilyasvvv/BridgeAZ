const express = require("express");
const mongoose = require("mongoose");
const ChatThread = require("../models/ChatThread");
const ChatMessage = require("../models/ChatMessage");
const Notification = require("../models/Notification");
const User = require("../models/User");
const QBlock = require("../models/QBlock");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString, FIELD_LIMITS } = require("../middleware/sanitize");
const realtime = require("../utils/realtime");

const router = express.Router();
const PARTICIPANT_SELECT =
  "name username accountType avatarUrl profilePhotoUrl profilePictureUrl currentRegion headline";

const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);

const toThreadPayload = (thread, userId) => {
  const otherParticipant = (thread.participants || []).find(
    (participant) => !sameId(participant, userId)
  );
  const myReadState = (thread.readStates || []).find((state) =>
    sameId(state.userId, userId)
  );
  const otherReadState = (thread.readStates || []).find(
    (state) => !sameId(state.userId, userId)
  );
  return {
    ...thread.toObject(),
    otherParticipant,
    myLastReadAt: myReadState?.lastReadAt || null,
    otherLastReadAt: otherReadState?.lastReadAt || null
  };
};

const populateThread = (thread) =>
  thread.populate("participants", PARTICIPANT_SELECT);

const hasChatBlock = (leftUserId, rightUserId) =>
  QBlock.exists({
    $or: [
      { blocker: leftUserId, blocked: rightUserId },
      { blocker: rightUserId, blocked: leftUserId }
    ]
  });

const publishThread = (thread, event = "chat:thread") => {
  realtime.publishToUsers(thread.participants || [], event, {
    threadId: thread._id,
    thread
  });
};

router.get("/threads", authMiddleware, blockBanned, async (req, res) => {
  try {
    const threads = await ChatThread.find({ participants: req.user._id })
      .populate("participants", PARTICIPANT_SELECT)
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
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }
    const recipientUser = await User.findById(userId).select("_id banned");
    if (!recipientUser || recipientUser.banned) {
      return res.status(404).json({ message: "User not found" });
    }
    const blocked = await hasChatBlock(req.user._id, userId);
    if (blocked) {
      return res.status(403).json({ message: "This conversation is unavailable" });
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
        const populatedExisting = await populateThread(existing);
        return res.json(toThreadPayload(populatedExisting, req.user._id));
      }
      const populated = await populateThread(existing);
      const payload = toThreadPayload(populated, req.user._id);
      try {
        const recipient = (populated.participants || []).find(
          (participant) => !sameId(participant, req.user._id)
        );
        if (recipient) {
          const notification = await Notification.findOneAndUpdate(
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
          realtime.publishToUser(recipient._id, "notification", notification);
        }
      } catch (notifyError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Chat request notification failed:", notifyError.message || notifyError);
        }
      }
      publishThread(populated);
      return res.json(payload);
    }

    const thread = await ChatThread.create({
      participants: [req.user._id, userId],
      status: "pending",
      requestedBy: req.user._id,
      lastMessageAt: new Date()
    });
    const populated = await populateThread(thread);
    const payload = toThreadPayload(populated, req.user._id);
    try {
      const recipient = (populated.participants || []).find(
        (participant) => !sameId(participant, req.user._id)
      );
      if (recipient) {
        const notification = await Notification.findOneAndUpdate(
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
        realtime.publishToUser(recipient._id, "notification", notification);
      }
    } catch (notifyError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Chat request notification failed:", notifyError.message || notifyError);
      }
    }
    publishThread(populated);
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
      .populate("senderId", PARTICIPANT_SELECT)
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
      share,
      replyTo,
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
    const normalizedShare =
      share &&
      typeof share === "object" &&
      typeof share.entityType === "string" &&
      typeof share.entityId !== "undefined" &&
      typeof share.url === "string"
        ? {
            entityType: share.entityType,
            entityId: String(share.entityId),
            url: share.url,
            title: typeof share.title === "string" ? share.title : "",
            subtitle: typeof share.subtitle === "string" ? share.subtitle : "",
            imageUrl: typeof share.imageUrl === "string" ? share.imageUrl : "",
            meta: share.meta && typeof share.meta === "object" ? share.meta : undefined
          }
        : undefined;

    const cleanBody = body ? sanitizeString(body, FIELD_LIMITS.message) : "";

    if (
      !resolvedAttachmentUrl &&
      normalizedAttachments.length === 0 &&
      (!cleanBody || !cleanBody.trim()) &&
      !normalizedShare
    ) {
      return res.status(400).json({ message: "Message body or attachment is required" });
    }

    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    const otherParticipantId = (thread.participants || []).find(
      (participant) => !sameId(participant, req.user._id)
    );
    if (otherParticipantId && (await hasChatBlock(req.user._id, otherParticipantId))) {
      return res.status(403).json({ message: "This conversation is unavailable" });
    }
    const status = thread.status || "active";
    if (status === "pending") {
      const isRequester =
        thread.requestedBy && String(thread.requestedBy) === String(req.user._id);
      if (!isRequester) {
        return res.status(403).json({ message: "Thread is pending approval" });
      }
      const hasAnyMessage = await ChatMessage.exists({ threadId: thread._id });
      if (hasAnyMessage) {
        return res.status(403).json({ message: "Thread is pending approval" });
      }
    }
    if (status === "rejected") {
      return res.status(403).json({ message: "Thread was rejected" });
    }

    const message = await ChatMessage.create({
      threadId: req.params.id,
      senderId: req.user._id,
      body: cleanBody,
      share: normalizedShare,
      replyTo: replyTo
        ? {
            messageId: replyTo.messageId,
            body: replyTo.body,
            senderId: replyTo.senderId
          }
        : undefined,
      attachments: normalizedAttachments,
      attachmentUrl: resolvedAttachmentUrl,
      attachmentContentType: resolvedAttachmentContentType,
      attachmentKind: resolvedAttachmentKind,
      attachmentName: resolvedAttachmentName
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    const populatedMessage = await message.populate("senderId", PARTICIPANT_SELECT);

    try {
      const recipient = (thread.participants || []).find(
        (participant) => !sameId(participant, req.user._id)
      );
      if (recipient && !sameId(recipient, req.user._id)) {
        const notificationBody =
          (message.body || "").trim() ||
          (message.share?.title ? `Shared: ${message.share.title}` : "") ||
          "Sent an attachment";
        const notification = await Notification.findOneAndUpdate(
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
              body: notificationBody.slice(0, 140),
              link: `/chats?thread=${thread._id}`,
              read: false,
              metadata: { threadId: thread._id, actorName: req.user.name }
            }
          },
          { upsert: true, new: true }
        );
        realtime.publishToUser(recipient, "notification", notification);
      }
    } catch (notifyError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Chat notification failed:", notifyError.message || notifyError);
      }
    }

    realtime.publishToUsers(thread.participants, "chat:message", {
      threadId: thread._id,
      message: populatedMessage
    });
    res.status(201).json(populatedMessage);
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
    const payload = { ok: true, threadId: thread._id, userId: req.user._id, lastReadAt: now };
    realtime.publishToUsers(thread.participants, "chat:read", payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to mark thread as read" });
  }
});

router.post("/messages/:id/react", authMiddleware, blockBanned, async (req, res) => {
  try {
    const emoji =
      typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";
    if (!emoji) {
      return res.status(400).json({ message: "emoji is required" });
    }

    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const thread = await ChatThread.findOne({
      _id: message.threadId,
      participants: req.user._id
    }).select("_id participants");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const existing = Array.isArray(message.reactions?.get?.(emoji))
      ? message.reactions.get(emoji).map((id) => String(id))
      : [];
    const myId = String(req.user._id);
    const next = existing.includes(myId)
      ? existing.filter((id) => id !== myId)
      : [...existing, myId];

    if (next.length) {
      message.reactions.set(emoji, next);
    } else {
      message.reactions.delete(emoji);
    }
    message.markModified("reactions");
    await message.save();

    realtime.publishToUsers(thread.participants, "chat:reaction", {
      threadId: message.threadId,
      messageId: message._id,
      reactions: message.reactions
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle reaction" });
  }
});

router.post("/threads/:id/accept", authMiddleware, blockBanned, async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      participants: req.user._id
    }).populate("participants", PARTICIPANT_SELECT);
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
    publishThread(thread);
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
    }).populate("participants", PARTICIPANT_SELECT);
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
    publishThread(thread);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject request" });
  }
});

module.exports = router;
