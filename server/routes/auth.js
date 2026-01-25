const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      userType: user.userType,
      currentRegion: user.currentRegion,
      studentVerified: user.studentVerified,
      mentorVerified: user.mentorVerified,
      isAdmin: user.isAdmin,
      banned: user.banned
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, userType, currentRegion } = req.body;

    if (!name || !email || !password || !userType || !currentRegion) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      userType,
      currentRegion,
      roles: [userType],
      studentVerified: false,
      mentorVerified: false,
      verificationStatus: "unverified"
    });

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    res.status(201).json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.banned) {
      return res.status(403).json({ message: "Your account has been banned." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", authMiddleware, blockBanned, (req, res) => {
  res.json(req.user);
});

module.exports = router;
