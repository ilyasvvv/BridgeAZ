const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { getBucket } = require("../utils/gridfs");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authMiddleware, blockBanned, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const bucket = getBucket();
    const filename = req.file.originalname || "upload";
    const contentType = req.file.mimetype || "application/octet-stream";
    const uploadStream = bucket.openUploadStream(filename, { contentType });

    const fileId = await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", (result) => resolve(result._id));
    });

    const fileUrl = `/uploads/${fileId}`;
    res.json({ fileUrl });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload file" });
  }
});

module.exports = router;
