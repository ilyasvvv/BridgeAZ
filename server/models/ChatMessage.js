const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String },
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
  if (!hasBody && !hasAttachment) {
    return next(new Error("Message body or attachment is required"));
  }
  return next();
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
