const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { syncVerificationStatus } = require("../utils/verification");
const { getBucket } = require("../utils/gridfs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "document", maxCount: 1 }
]);

const uploadToGridFS = (file) => {
  const bucket = getBucket();
  const filename = file.originalname || "verification";
  const contentType = file.mimetype || "application/octet-stream";
  const uploadStream = bucket.openUploadStream(filename, { contentType });

  return new Promise((resolve, reject) => {
    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", (result) => resolve(result._id));
  });
};

router.post("/student", authMiddleware, blockBanned, uploadFields, async (req, res) => {
  try {
    const file = req.files?.file?.[0] || req.files?.document?.[0];
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    const fileId = await uploadToGridFS(file);
    const documentUrl = `/api/files/${fileId}`;

    const request = await VerificationRequest.create({
      user: req.user._id,
      requestType: "student",
      documentUrl,
      status: "pending"
    });

    await syncVerificationStatus(req.user._id);

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit verification" });
  }
});

router.post("/mentor", authMiddleware, blockBanned, uploadFields, async (req, res) => {
  try {
    const { universityEmail, linkedinUrl, note } = req.body;
    const file = req.files?.file?.[0] || req.files?.document?.[0];
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    const fileId = await uploadToGridFS(file);
    const documentUrl = `/api/files/${fileId}`;

    const request = await VerificationRequest.create({
      user: req.user._id,
      requestType: "mentor",
      documentUrl,
      status: "pending",
      metadata: {
        universityEmail,
        linkedinUrl,
        note
      }
    });

    await User.findByIdAndUpdate(req.user._id, { isMentor: true });
    await syncVerificationStatus(req.user._id);

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit mentor verification" });
  }
});

router.get("/my-requests", authMiddleware, blockBanned, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to load requests" });
  }
});

module.exports = router;
