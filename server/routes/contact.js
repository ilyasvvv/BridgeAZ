const express = require("express");
const ContactMessage = require("../models/ContactMessage");

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    await ContactMessage.create({ name, email, message });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit contact message" });
  }
});

module.exports = router;
