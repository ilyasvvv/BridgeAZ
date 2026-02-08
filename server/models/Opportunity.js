const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    link: { type: String, trim: true },
    orgName: { type: String, trim: true },
    type: {
      type: String,
      enum: [
        "Internship",
        "Full-time",
        "Part-time",
        "Research",
        "Contract",
        "Volunteer",
        "internship",
        "job",
        "other"
      ],
      default: "Internship"
    },
    locationMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Remote"
    },
    country: {
      type: String,
      trim: true,
      default: ""
    },
    city: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    requirements: [String],
    applyUrl: String,
    contactEmail: String,
    visibilityRegion: {
      type: String,
      trim: true,
      default: "ALL"
    },
    tags: [String],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);
