const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addresseeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

connectionSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

module.exports = mongoose.model("Connection", connectionSchema);
