const mongoose = require("mongoose");

const qPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["general", "event", "opportunity", "request", "discussion", "announcement", "food", "housing", "culture"],
      default: "general",
    },
    content: { type: String, required: true },
    templateData: {
      eventDate: Date,
      eventLocation: String,
      eventCity: String,
      eventCountry: String,
      oppType: String,
      oppCompany: String,
      oppLocationMode: String,
      oppApplyUrl: String,
      oppContactEmail: String,
      requestType: String,
      housingType: String,
      priceRange: String,
    },
    location: {
      country: String,
      countryCode: String,
      city: String,
      region: String,
      coordinates: { lat: Number, lng: Number },
    },
    tags: [String],
    suggestedTags: [String],
    attachments: [
      {
        url: String,
        contentType: String,
        kind: { type: String, enum: ["image", "video", "pdf", "file"] },
      },
    ],
    visibility: { type: String, enum: ["public", "local", "connections"], default: "public" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    interested: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    interestedCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "closed", "removed"], default: "active" },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

qPostSchema.index({ "location.countryCode": 1, category: 1, createdAt: -1 });
qPostSchema.index({ tags: 1 });
qPostSchema.index({ author: 1, createdAt: -1 });
qPostSchema.index({ content: "text", tags: "text" });

module.exports = mongoose.model("QPost", qPostSchema);
