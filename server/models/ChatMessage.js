const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    contentType: String,
    kind: { type: String, enum: ["image", "pdf", "file"] },
    name: String
  },
  { _id: false }
);

const replyToSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    body: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const shareSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["post", "opportunity", "profile", "comment"]
    },
    entityId: String,
    url: String,
    title: String,
    subtitle: String,
    imageUrl: String,
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String },
    share: shareSchema,
    replyTo: replyToSchema,
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {}
    },
    attachments: { type: [attachmentSchema], default: [] },
    attachmentUrl: String,
    attachmentContentType: String,
    attachmentKind: { type: String, enum: ["image", "pdf", "file"] },
    attachmentName: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.pre("validate", function (next) {
  const hasBody = typeof this.body === "string" && this.body.trim().length > 0;
  const hasAttachment = typeof this.attachmentUrl === "string" && this.attachmentUrl.length > 0;
  const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;
  const hasShare = !!(this.share && this.share.entityType && this.share.entityId && this.share.url);
  if (!hasBody && !hasAttachment && !hasAttachments && !hasShare) {
    return next(new Error("Message body or attachment is required"));
  }
  return next();
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
