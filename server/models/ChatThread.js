const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: Date,
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "active",
      index: true
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: Date,
    rejectedAt: Date,
    readStates: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        lastReadAt: Date
      }
    ]
  },
  { timestamps: true }
);

chatThreadSchema.index({ participants: 1 });

module.exports = mongoose.model("ChatThread", chatThreadSchema);
