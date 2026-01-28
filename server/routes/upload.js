const express = require("express");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.post("/", authMiddleware, blockBanned, (req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

module.exports = router;
