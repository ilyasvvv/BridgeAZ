const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: Date
  },
  { timestamps: true }
);

chatThreadSchema.index({ participants: 1 });

module.exports = mongoose.model("ChatThread", chatThreadSchema);
