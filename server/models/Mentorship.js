const mongoose = require("mongoose");

const mentorshipSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "ended", "archived"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});

mentorshipSchema.index({ mentorId: 1, menteeId: 1 }, { unique: true });

module.exports = mongoose.model("Mentorship", mentorshipSchema);
