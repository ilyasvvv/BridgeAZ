const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ""
  },
  forcePathStyle: true
});

const validateUpload = ({ mimeType, sizeBytes }) => {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported file type");
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Invalid file size");
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File must be 5MB or less");
  }
};

const sanitizeFilename = (name) => {
  const base = path.basename(name || "document");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const buildObjectKey = (userId, originalName, purpose = "verification") => {
  const safeName = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const safePurpose = sanitizeFilename(purpose || "verification");
  return `${safePurpose}/${userId}/${timestamp}_${safeName}`;
};

const buildPublicUrl = (objectKey) => {
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const key = String(objectKey || "").replace(/^\/+/, "");
  return `${base}/${key}`;
};

module.exports = {
  r2Client,
  validateUpload,
  buildObjectKey,
  buildPublicUrl,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES
};
