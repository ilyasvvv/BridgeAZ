const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const QPost = require("../models/QPost");
const QComment = require("../models/QComment");
const QBlock = require("../models/QBlock");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString } = require("../middleware/sanitize");
const realtime = require("../utils/realtime");

const AUTHOR_SELECT =
  "name avatarUrl profilePhotoUrl profilePictureUrl currentRegion accountType qLocation";

// ---------- GET / — paginated feed ----------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      country,
      city,
      category,
      tags,
      search,
      sort = "recent",
      timeRange = "all",
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Get blocked user IDs
    const blocks = await QBlock.find({ blocker: req.user._id }).select("blocked");
    const blockedIds = blocks.map((b) => b.blocked);

    const filter = { status: "active" };

    if (blockedIds.length > 0) {
      filter.author = { $nin: blockedIds };
    }

    if (country) filter["location.countryCode"] = country;
    if (city) filter["location.city"] = city;

    if (category) {
      const cats = category.split(",").map((c) => c.trim()).filter(Boolean);
      if (cats.length > 0) filter.category = { $in: cats };
    }

    if (tags) {
      const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagArr.length > 0) filter.tags = { $in: tagArr };
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (timeRange && timeRange !== "all") {
      const now = new Date();
      let since;
      if (timeRange === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === "week") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === "month") {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (since) filter.createdAt = { $gte: since };
    }

    let sortObj;
    if (sort === "popular") {
      sortObj = { likeCount: -1, createdAt: -1 };
    } else {
      sortObj = { pinned: -1, createdAt: -1 };
    }

    const [posts, total] = await Promise.all([
      QPost.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate("author", AUTHOR_SELECT)
        .lean(),
      QPost.countDocuments(filter),
    ]);

    const userId = req.user._id.toString();
    const enriched = posts.map((p) => ({
      ...p,
      likedByMe: (p.likes || []).some((id) => id.toString() === userId),
      bookmarkedByMe: (p.bookmarks || []).some((id) => id.toString() === userId),
      interestedByMe: (p.interested || []).some((id) => id.toString() === userId),
      likes: undefined,
      bookmarks: undefined,
      interested: undefined,
    }));

    res.json({
      posts: enriched,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (err) {
    console.error("GET /api/q/posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ---------- POST / — create post ----------
router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const {
      category,
      content,
      templateData,
      location,
      tags,
      suggestedTags,
      attachments,
      visibility,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const post = await QPost.create({
      author: req.user._id,
      category,
      content: sanitizeString(content),
      templateData,
      location,
      tags,
      suggestedTags,
      attachments,
      visibility,
    });

    const populated = await QPost.findById(post._id)
      .populate("author", AUTHOR_SELECT)
      .lean();

    realtime.publishToUser(req.user._id, "q:post_created", populated);
    res.status(201).json(populated);
  } catch (err) {
    console.error("POST /api/q/posts error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ---------- GET /:id — single post ----------
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const post = await QPost.findById(req.params.id)
      .populate("author", AUTHOR_SELECT)
      .lean();

    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = await QComment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate("author", AUTHOR_SELECT)
      .lean();

    const userId = req.user._id.toString();
    post.likedByMe = (post.likes || []).some((id) => id.toString() === userId);
    post.bookmarkedByMe = (post.bookmarks || []).some((id) => id.toString() === userId);
    post.interestedByMe = (post.interested || []).some((id) => id.toString() === userId);
    delete post.likes;
    delete post.bookmarks;
    delete post.interested;

    res.json({ post, comments });
  } catch (err) {
    console.error("GET /api/q/posts/:id error:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// ---------- PATCH /:id — update post ----------
router.patch("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorised" });
    }

    const allowed = [
      "category",
      "content",
      "templateData",
      "location",
      "tags",
      "suggestedTags",
      "attachments",
      "visibility",
      "status",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        post[key] = key === "content" ? sanitizeString(req.body[key]) : req.body[key];
      }
    }
    await post.save();

    const updated = await QPost.findById(post._id)
      .populate("author", AUTHOR_SELECT)
      .lean();

    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/q/posts/:id error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ---------- DELETE /:id ----------
router.delete("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorised" });
    }

    await QComment.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("DELETE /api/q/posts/:id error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ---------- POST /:id/like ----------
router.post("/:id/like", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!post.likes.some((id) => id.toString() === req.user._id.toString())) {
      post.likes.push(req.user._id);
      post.likeCount = post.likes.length;
      await post.save();
    }

    realtime.publishToUser(post.author, "q:post_liked", {
      postId: post._id,
      likeCount: post.likeCount,
      likedByMe: true,
      actorId: req.user._id
    });
    res.json({ likeCount: post.likeCount, likedByMe: true });
  } catch (err) {
    console.error("POST /:id/like error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
});

// ---------- DELETE /:id/like ----------
router.delete("/:id/like", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    post.likeCount = post.likes.length;
    await post.save();

    res.json({ likeCount: post.likeCount, likedByMe: false });
  } catch (err) {
    console.error("DELETE /:id/like error:", err);
    res.status(500).json({ error: "Failed to unlike post" });
  }
});

// ---------- POST /:id/bookmark ----------
router.post("/:id/bookmark", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!post.bookmarks.some((id) => id.toString() === req.user._id.toString())) {
      post.bookmarks.push(req.user._id);
      await post.save();
    }

    res.json({ bookmarkedByMe: true });
  } catch (err) {
    console.error("POST /:id/bookmark error:", err);
    res.status(500).json({ error: "Failed to bookmark post" });
  }
});

// ---------- DELETE /:id/bookmark ----------
router.delete("/:id/bookmark", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.bookmarks = post.bookmarks.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await post.save();

    res.json({ bookmarkedByMe: false });
  } catch (err) {
    console.error("DELETE /:id/bookmark error:", err);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

// ---------- POST /:id/interested ----------
router.post("/:id/interested", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!post.interested.some((id) => id.toString() === req.user._id.toString())) {
      post.interested.push(req.user._id);
      post.interestedCount = post.interested.length;
      await post.save();
    }

    res.json({ interestedCount: post.interestedCount, interestedByMe: true });
  } catch (err) {
    console.error("POST /:id/interested error:", err);
    res.status(500).json({ error: "Failed to mark interested" });
  }
});

// ---------- DELETE /:id/interested ----------
router.delete("/:id/interested", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.interested = post.interested.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    post.interestedCount = post.interested.length;
    await post.save();

    res.json({ interestedCount: post.interestedCount, interestedByMe: false });
  } catch (err) {
    console.error("DELETE /:id/interested error:", err);
    res.status(500).json({ error: "Failed to remove interested" });
  }
});

// ---------- GET /:id/comments ----------
router.get("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const comments = await QComment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate("author", AUTHOR_SELECT)
      .lean();

    res.json(comments);
  } catch (err) {
    console.error("GET /:id/comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// ---------- POST /:id/comments ----------
router.post("/:id/comments", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await QPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const { content, parentComment } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const comment = await QComment.create({
      post: post._id,
      author: req.user._id,
      content: sanitizeString(content),
      parentComment: parentComment || null,
    });

    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    const populated = await QComment.findById(comment._id)
      .populate("author", AUTHOR_SELECT)
      .lean();

    realtime.publishToUser(post.author, "q:post_commented", {
      postId: post._id,
      comment: populated
    });
    res.status(201).json(populated);
  } catch (err) {
    console.error("POST /:id/comments error:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

module.exports = router;
