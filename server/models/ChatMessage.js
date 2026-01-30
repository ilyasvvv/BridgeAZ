const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
