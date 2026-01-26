const express = require("express");
const mongoose = require("mongoose");
const { getBucket } = require("../utils/gridfs");

const router = express.Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid file id" });
  }

  const bucket = getBucket();
  const fileId = new mongoose.Types.ObjectId(id);

  bucket
    .find({ _id: fileId })
    .toArray()
    .then((files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({ message: "File not found" });
      }

      const file = files[0];
      res.set("Content-Type", file.contentType || "application/octet-stream");
      if (file.length != null) {
        res.set("Content-Length", file.length.toString());
      }

      bucket.openDownloadStream(fileId).on("error", () => {
        res.status(404).json({ message: "File not found" });
      }).pipe(res);
    })
    .catch(() => {
      res.status(500).json({ message: "Failed to load file" });
    });
});

module.exports = router;
