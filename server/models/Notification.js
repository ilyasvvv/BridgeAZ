const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index(
  { type: 1, userId: 1, actorId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { type: "post_like", postId: { $exists: true } } }
);

module.exports = mongoose.model("Notification", notificationSchema);
