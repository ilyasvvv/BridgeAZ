const express = require("express");
const multer = require("multer");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { uploadDir } = require("../utils/uploads");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

router.post("/", authMiddleware, blockBanned, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ fileUrl });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload file" });
  }
});

module.exports = router;
