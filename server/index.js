require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const verificationRoutes = require("./routes/verification");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const uploadsRoutes = require("./routes/uploads");
const mentorshipRoutes = require("./routes/mentorship");
const opportunityRoutes = require("./routes/opportunities");
const contactRoutes = require("./routes/contact");
const notificationRoutes = require("./routes/notifications");
const chatRoutes = require("./routes/chats");
const networkRoutes = require("./routes/network");
const followRoutes = require("./routes/follows");
const searchRoutes = require("./routes/search");
const {
  authLimiter,
  postLimiter,
  searchLimiter,
  connectionLimiter,
  chatLimiter,
  generalLimiter
} = require("./middleware/rateLimiter");

const app = express();

const allowedOrigins = new Set(
  (
    process.env.SERVER_ALLOWED_ORIGINS ||
    process.env.CLIENT_URL ||
    "http://localhost:5173,https://bridge-az.vercel.app"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

let originRegex = null;
if (process.env.SERVER_ALLOWED_ORIGIN_REGEX) {
  try {
    originRegex = new RegExp(process.env.SERVER_ALLOWED_ORIGIN_REGEX);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Invalid SERVER_ALLOWED_ORIGIN_REGEX; ignoring.");
    }
    originRegex = null;
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    if (originRegex && originRegex.test(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn(`CORS blocked origin: ${origin}`);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
// Handle preflight globally so OPTIONS never reaches auth/routes.
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", generalLimiter, userRoutes);
app.use("/api/posts", postLimiter, postRoutes);
app.use("/api/verification", generalLimiter, verificationRoutes);
app.use("/api/admin", generalLimiter, adminRoutes);
app.use("/api/upload", generalLimiter, uploadRoutes);
app.use("/api/uploads", generalLimiter, uploadsRoutes);
app.use("/api/mentorship-requests", connectionLimiter, mentorshipRoutes);
app.use("/api/opportunities", generalLimiter, opportunityRoutes);
app.use("/api/contact", generalLimiter, contactRoutes);
app.use("/api/notifications", generalLimiter, notificationRoutes);
app.use("/api/chats", chatLimiter, chatRoutes);
app.use("/api/search", searchLimiter, searchRoutes);
app.use("/api/users", connectionLimiter, followRoutes);
app.use("/api", connectionLimiter, networkRoutes);

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
