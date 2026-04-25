const express = require("express");
const mongoose = require("mongoose");
const Circle = require("../models/Circle");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString, FIELD_LIMITS } = require("../middleware/sanitize");
const realtime = require("../utils/realtime");

const router = express.Router();

const OWNER_SELECT = "name username accountType avatarUrl profilePhotoUrl profilePictureUrl currentRegion headline";

const normalizeHandle = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "");

const normalizeVisibility = (value) =>
  ["public", "request", "private"].includes(value) ? value : "public";

const isCircleAdmin = (circle, userId) => {
  const id = String(userId);
  if (String(circle.owner?._id || circle.owner) === id) return true;
  return (circle.members || []).some(
    (member) =>
      String(member.userId?._id || member.userId) === id &&
      member.status === "active" &&
      ["owner", "admin"].includes(member.role)
  );
};

const memberState = (circle, userId) => {
  const id = String(userId);
  const member = (circle.members || []).find((item) => String(item.userId?._id || item.userId) === id);
  return {
    isOwner: String(circle.owner?._id || circle.owner) === id,
    isAdmin: isCircleAdmin(circle, id),
    membershipStatus: member?.status || null,
    memberRole: member?.role || null
  };
};

const serializeCircle = (circle, userId) => {
  const obj = circle.toObject ? circle.toObject() : circle;
  return {
    ...obj,
    ...memberState(obj, userId)
  };
};

const findCircle = async (idOrHandle) => {
  const query = mongoose.Types.ObjectId.isValid(idOrHandle)
    ? { _id: idOrHandle }
    : { handle: normalizeHandle(idOrHandle) };
  return Circle.findOne(query).populate("owner", OWNER_SELECT);
};

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { region, mine, q } = req.query;
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;
    const query = {};

    if (mine === "true") {
      query.$or = [
        { owner: req.user._id },
        { members: { $elemMatch: { userId: req.user._id, status: "active" } } }
      ];
    } else {
      query.visibility = { $ne: "private" };
    }

    if (region) query.currentRegion = sanitizeString(region, 100);
    if (q && String(q).trim().length >= 2) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      query.$and = [
        ...(query.$and || []),
        { $or: [{ name: regex }, { handle: regex }, { bio: regex }, { currentRegion: regex }] }
      ];
    }

    const circles = await Circle.find(query)
      .populate("owner", OWNER_SELECT)
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.json(circles.map((circle) => serializeCircle(circle, req.user._id)));
  } catch (error) {
    res.status(500).json({ message: "Failed to load circles" });
  }
});

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const name = sanitizeString(req.body?.name, FIELD_LIMITS.name);
    const handle = normalizeHandle(req.body?.handle || name);
    const bio = sanitizeString(req.body?.bio || "", FIELD_LIMITS.bio);
    const currentRegion = sanitizeString(req.body?.currentRegion || "", 100);

    if (!name || handle.length < 3 || handle.length > 24) {
      return res.status(400).json({ message: "Circle name and 3-24 character handle are required" });
    }

    const existing = await Circle.findOne({ handle }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "Circle handle already taken" });
    }

    const circle = await Circle.create({
      name,
      handle,
      owner: req.user._id,
      bio,
      currentRegion,
      location: {
        city: sanitizeString(req.body?.location?.city || req.body?.city || "", 100),
        country: sanitizeString(req.body?.location?.country || req.body?.country || "", 100)
      },
      visibility: normalizeVisibility(req.body?.visibility),
      minAge: Boolean(req.body?.minAge),
      avatarUrl: sanitizeString(req.body?.avatarUrl || "", 500),
      bannerUrl: sanitizeString(req.body?.bannerUrl || "", 500),
      members: [{ userId: req.user._id, role: "owner", status: "active" }],
      memberCount: 1
    });

    const populated = await circle.populate("owner", OWNER_SELECT);
    realtime.publishToUser(req.user._id, "circle:created", serializeCircle(populated, req.user._id));
    res.status(201).json(serializeCircle(populated, req.user._id));
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Circle handle already taken" });
    }
    res.status(500).json({ message: "Failed to create circle" });
  }
});

router.get("/:idOrHandle", authMiddleware, blockBanned, async (req, res) => {
  try {
    const circle = await findCircle(req.params.idOrHandle);
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.visibility === "private" && !isCircleAdmin(circle, req.user._id)) {
      return res.status(404).json({ message: "Circle not found" });
    }

    res.json(serializeCircle(circle, req.user._id));
  } catch (error) {
    res.status(500).json({ message: "Failed to load circle" });
  }
});

router.get("/:idOrHandle/posts", authMiddleware, blockBanned, async (req, res) => {
  try {
    const circle = await findCircle(req.params.idOrHandle);
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const posts = await Post.find({ circle: circle._id })
      .populate("author", "name username avatarUrl profilePhotoUrl profilePictureUrl currentRegion accountType headline")
      .populate("circle", "name handle avatarUrl currentRegion visibility")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Failed to load circle posts" });
  }
});

router.patch("/:idOrHandle", authMiddleware, blockBanned, async (req, res) => {
  try {
    const circle = await findCircle(req.params.idOrHandle);
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }
    if (!isCircleAdmin(circle, req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updates = {};
    ["name", "bio", "currentRegion", "avatarUrl", "bannerUrl"].forEach((field) => {
      if (req.body?.[field] !== undefined) {
        const limit = field === "bio" ? FIELD_LIMITS.bio : field === "name" ? FIELD_LIMITS.name : 500;
        updates[field] = sanitizeString(req.body[field], limit);
      }
    });
    if (req.body?.visibility !== undefined) updates.visibility = normalizeVisibility(req.body.visibility);
    if (req.body?.minAge !== undefined) updates.minAge = Boolean(req.body.minAge);
    if (req.body?.location !== undefined) {
      updates.location = {
        city: sanitizeString(req.body.location?.city || "", 100),
        country: sanitizeString(req.body.location?.country || "", 100)
      };
    }

    const updated = await Circle.findByIdAndUpdate(circle._id, updates, { new: true })
      .populate("owner", OWNER_SELECT);

    const payload = serializeCircle(updated, req.user._id);
    realtime.publishToUsers(
      (updated.members || []).map((member) => member.userId),
      "circle:updated",
      payload
    );
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to update circle" });
  }
});

router.post("/:idOrHandle/join", authMiddleware, blockBanned, async (req, res) => {
  try {
    const circle = await findCircle(req.params.idOrHandle);
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }
    if (circle.visibility === "private") {
      return res.status(403).json({ message: "This circle is private" });
    }

    const existing = (circle.members || []).find(
      (member) => String(member.userId?._id || member.userId) === String(req.user._id)
    );
    const nextStatus = circle.visibility === "request" ? "pending" : "active";

    if (existing) {
      existing.status = existing.status === "active" ? "active" : nextStatus;
      existing.joinedAt = existing.joinedAt || new Date();
    } else {
      circle.members.push({ userId: req.user._id, role: "member", status: nextStatus });
    }
    circle.memberCount = circle.members.filter((member) => member.status === "active").length;
    await circle.save();

    if (String(circle.owner?._id || circle.owner) !== String(req.user._id)) {
      const notification = await Notification.create({
        type: nextStatus === "pending" ? "circle_join_request" : "circle_join",
        userId: circle.owner?._id || circle.owner,
        actorId: req.user._id,
        title: `${req.user.name} ${nextStatus === "pending" ? "requested to join" : "joined"} ${circle.name}`,
        body: circle.bio || circle.currentRegion || "Circle membership update",
        link: `/circle/${circle.handle}`,
        metadata: { circleId: circle._id, circleHandle: circle.handle, actorName: req.user.name }
      });
      realtime.publishToUser(circle.owner?._id || circle.owner, "notification", notification);
    }

    const populated = await Circle.findById(circle._id).populate("owner", OWNER_SELECT);
    const payload = serializeCircle(populated, req.user._id);
    realtime.publishToUser(req.user._id, "circle:joined", payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to join circle" });
  }
});

router.delete("/:idOrHandle/join", authMiddleware, blockBanned, async (req, res) => {
  try {
    const circle = await findCircle(req.params.idOrHandle);
    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }
    if (String(circle.owner?._id || circle.owner) === String(req.user._id)) {
      return res.status(400).json({ message: "Circle owner cannot leave" });
    }

    circle.members = (circle.members || []).filter(
      (member) => String(member.userId?._id || member.userId) !== String(req.user._id)
    );
    circle.memberCount = circle.members.filter((member) => member.status === "active").length;
    await circle.save();

    realtime.publishToUser(req.user._id, "circle:left", { circleId: circle._id, handle: circle.handle });
    res.json({ joined: false, circleId: circle._id });
  } catch (error) {
    res.status(500).json({ message: "Failed to leave circle" });
  }
});

module.exports = router;
