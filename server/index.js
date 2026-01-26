require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { initGridFS } = require("./utils/gridfs");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const verificationRoutes = require("./routes/verification");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const mentorshipRoutes = require("./routes/mentorship");
const opportunityRoutes = require("./routes/opportunities");
const filesRoutes = require("./routes/files");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mentorship-requests", mentorshipRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/files", filesRoutes);
app.use("/uploads", filesRoutes);

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    initGridFS(mongoose.connection);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
