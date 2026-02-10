const mongoose = require("mongoose");

const allowedTypes = ["internship", "full-time", "contract", "collaboration", "other"];
const allowedLocationModes = ["remote", "hybrid", "onsite"];

const opportunityNotifyPrefSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    types: {
      type: [String],
      enum: allowedTypes,
      default: []
    },
    locationModes: {
      type: [String],
      enum: allowedLocationModes,
      default: []
    },
    country: {
      type: String,
      trim: true,
      default: ""
    },
    keywords: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OpportunityNotifyPref", opportunityNotifyPrefSchema);
