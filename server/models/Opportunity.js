const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    orgName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Internship", "Full-time", "Part-time", "Research", "Contract", "Volunteer"],
      default: "Internship"
    },
    locationMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Remote"
    },
    country: {
      type: String,
      enum: ["AZ", "TR", "US", "OTHER"],
      default: "AZ"
    },
    city: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    requirements: [String],
    applyUrl: String,
    contactEmail: String,
    visibilityRegion: {
      type: String,
      enum: ["ALL", "AZ", "TR", "US"],
      default: "ALL"
    },
    tags: [String],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);
