const express = require("express");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const verificationDisabled = (req, res) =>
  res.status(410).json({ message: "Verification is no longer available." });

router.use(authMiddleware, blockBanned);
router.all("*", verificationDisabled);

module.exports = router;
