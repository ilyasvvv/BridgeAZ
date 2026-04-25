const express = require("express");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const realtime = require("../utils/realtime");

const router = express.Router();

router.get("/", authMiddleware, blockBanned, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const cleanup = realtime.registerClient(req.user._id, res);
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
});

router.get("/status", authMiddleware, blockBanned, (req, res) => {
  res.json({ ok: true, clients: realtime.getClientCount() });
});

module.exports = router;
