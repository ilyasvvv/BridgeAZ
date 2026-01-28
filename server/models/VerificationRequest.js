const mongoose = require("mongoose");

const adminNoteSchema = new mongoose.Schema({
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note: String,
  createdAt: { type: Date, default: Date.now }
});

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      alias: "userId"
    },
    requestType: {
      type: String,
      enum: ["student", "mentor"],
      required: true,
      index: true,
      alias: "type"
    },
    documentUrl: { type: String, alias: "attachmentUrl" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {}, alias: "fields" },
    adminReviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", alias: "reviewedBy" },
    adminComment: String,
    adminNotes: [adminNoteSchema],
    reviewedAt: Date
  },
  { timestamps: true }
);

verificationRequestSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("VerificationRequest", verificationRequestSchema);
