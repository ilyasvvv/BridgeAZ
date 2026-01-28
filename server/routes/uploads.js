const express = require("express");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const {
  r2Client,
  validateUpload,
  buildObjectKey,
  buildPublicUrl
} = require("../utils/r2");

const router = express.Router();

const storageConfigured = () => {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL
  );
};

router.post("/presign", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (!storageConfigured()) {
      return res.status(500).json({ message: "Upload storage not configured" });
    }

    const { originalName, mimeType, sizeBytes, purpose } = req.body || {};
    const parsedSize = Number(sizeBytes);
    if (!originalName || !mimeType || !sizeBytes || !purpose) {
      return res.status(400).json({ message: "Invalid upload request" });
    }

    if (purpose !== "verification") {
      return res.status(400).json({ message: "Invalid upload purpose" });
    }

    try {
      validateUpload({ mimeType, sizeBytes: parsedSize });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const objectKey = buildObjectKey(req.user._id, originalName);
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: objectKey,
      ContentType: mimeType
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    res.json({
      uploadUrl,
      objectKey,
      documentUrl: buildPublicUrl(objectKey),
      headers: { "Content-Type": mimeType }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create upload URL" });
  }
});

module.exports = router;
