const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addresseeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  message: { type: String, maxlength: 500, default: "" },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null }
});

connectionSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

module.exports = mongoose.model("Connection", connectionSchema);
