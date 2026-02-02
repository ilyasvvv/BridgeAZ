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

    const { originalName, mimeType, contentType, sizeBytes, purpose } = req.body || {};
    const parsedSize = Number(sizeBytes);
    const resolvedContentType = contentType || mimeType || "application/octet-stream";
    if (!originalName || !sizeBytes || !purpose) {
      return res.status(400).json({ message: "Invalid upload request" });
    }

    const allowedPurposes = new Set([
      "verification",
      "avatar",
      "resume",
      "attachment",
      "chat_attachment"
    ]);
    if (!allowedPurposes.has(purpose)) {
      return res.status(400).json({ message: "Invalid upload purpose" });
    }

    const objectKey = buildObjectKey(req.user._id, originalName, purpose);

    try {
      if (purpose === "avatar") {
        if (!["image/png", "image/jpeg"].includes(resolvedContentType)) {
          throw new Error("Unsupported file type");
        }
        if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
          throw new Error("Invalid file size");
        }
        if (parsedSize > 5 * 1024 * 1024) {
          throw new Error("File must be 5MB or less");
        }
      } else if (purpose === "attachment" || purpose === "chat_attachment") {
        const allowed = new Set([
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/pdf"
        ]);
        if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
          throw new Error("Invalid file size");
        }
        if (parsedSize > 5 * 1024 * 1024) {
          throw new Error("File must be 5MB or less");
        }
        if (!allowed.has(resolvedContentType)) {
          const fallbackCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: objectKey,
            ContentType: "application/octet-stream"
          });
          const uploadUrl = await getSignedUrl(r2Client, fallbackCommand, { expiresIn: 300 });
          return res.json({
            uploadUrl,
            objectKey,
            documentUrl: buildPublicUrl(objectKey),
            headers: { "Content-Type": "application/octet-stream" }
          });
        }
      } else {
        validateUpload({ mimeType: resolvedContentType, sizeBytes: parsedSize });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: objectKey,
      ContentType: resolvedContentType
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    res.json({
      uploadUrl,
      objectKey,
      documentUrl: buildPublicUrl(objectKey),
      headers: { "Content-Type": resolvedContentType }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create upload URL" });
  }
});

module.exports = router;
