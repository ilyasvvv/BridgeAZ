const mongoose = require("mongoose");

const circleMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    status: { type: String, enum: ["active", "pending"], default: "active" },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const circleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bio: { type: String, trim: true },
    currentRegion: { type: String, trim: true },
    location: {
      city: String,
      country: String
    },
    visibility: {
      type: String,
      enum: ["public", "request", "private"],
      default: "public",
      index: true
    },
    minAge: { type: Boolean, default: false },
    avatarUrl: String,
    bannerUrl: String,
    members: { type: [circleMemberSchema], default: [] },
    memberCount: { type: Number, default: 1 },
    postCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

circleSchema.index({ name: "text", handle: "text", bio: "text", currentRegion: "text" });
circleSchema.index({ currentRegion: 1, visibility: 1 });

module.exports = mongoose.model("Circle", circleSchema);
