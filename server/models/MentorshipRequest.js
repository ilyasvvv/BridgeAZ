const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
  {
    fromStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toMentor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: String,
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MentorshipRequest", mentorshipRequestSchema);
