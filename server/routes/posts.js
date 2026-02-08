const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();
const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const region = normalizeToken(req.query.region || req.user.currentRegion);
    const visibility = region && region.toUpperCase() !== "ALL" ? ["ALL", region] : ["ALL"];

    const posts = await Post.find({ visibilityRegion: { $in: visibility } })
      .populate("author", "name profilePhotoUrl currentRegion userType")
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: "name profilePhotoUrl" }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    const enriched = posts.map((post) => {
      const likedByMe = post.likes?.some((id) => id.equals(req.user._id)) || false;
      const likesCount = post.likes?.length || 0;
      const obj = post.toObject ? post.toObject() : post;
      return { ...obj, likedByMe, likesCount };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Failed to load posts" });
  }
});

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { content, attachmentUrl, attachmentContentType, visibilityRegion } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Post content is required" });
    }

    const inferContentTypeFromUrl = (url) => {
      if (!url) return "";
      const lower = url.toLowerCase();
      if (lower.endsWith(".png")) return "image/png";
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
      if (lower.endsWith(".webp")) return "image/webp";
      if (lower.endsWith(".gif")) return "image/gif";
      if (lower.endsWith(".pdf")) return "application/pdf";
      return "";
    };

    const resolveKind = (type, url) => {
      const t = type || inferContentTypeFromUrl(url);
      if (t.startsWith("image/")) return "image";
      if (t === "application/pdf") return "pdf";
      return "file";
    };

    const normalizedContentType =
      attachmentContentType || inferContentTypeFromUrl(attachmentUrl) || undefined;
    const attachmentKind = attachmentUrl ? resolveKind(normalizedContentType, attachmentUrl) : undefined;

    const post = await Post.create({
      author: req.user._id,
      content,
      attachmentUrl,
      attachmentContentType: normalizedContentType,
      attachmentKind,
      visibilityRegion: normalizeToken(visibilityRegion) || "ALL"
    });

    const populated = await post.populate("author", "name profilePhotoUrl currentRegion userType");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create post" });
  }
});

router.post("/:id/like", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.some((id) => id.equals(req.user._id));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(req.user._id));
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    if (!alreadyLiked && !post.author.equals(req.user._id)) {
      const preview = post.content ? post.content.slice(0, 140) : "";
      await Notification.findOneAndUpdate(
        {
          type: "post_like",
          userId: post.author,
          actorId: req.user._id,
          postId: post._id
        },
        {
          $setOnInsert: {
            type: "post_like",
            userId: post.author,
            actorId: req.user._id,
            postId: post._id,
            title: `${req.user.name} liked your post`,
            body: preview,
            metadata: { postId: post._id, actorName: req.user.name },
            read: false
          }
        },
        { upsert: true, new: true }
      );
    }
    res.json({ likesCount: post.likes.length, likedByMe: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

router.get("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await Post.findById(req.params.id)
      .populate("author", "name profilePhotoUrl currentRegion userType")
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: "name profilePhotoUrl" }
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const likedByMe = post.likes?.some((id) => id.equals(req.user._id)) || false;
    const likesCount = post.likes?.length || 0;
    const obj = post.toObject ? post.toObject() : post;
    res.json({ ...obj, likedByMe, likesCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to load post" });
  }
});

const handleCreateComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      content
    });

    if (typeof post.commentCount === "number") {
      post.commentCount += 1;
      await post.save();
    }

    const populated = await Post.findById(req.params.id)
      .populate("author", "name profilePhotoUrl currentRegion userType")
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: "name profilePhotoUrl" }
      });

    const populatedComment = await comment.populate("author", "name profilePhotoUrl");
    res.status(201).json({ ...populated.toObject(), createdComment: populatedComment });
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment" });
  }
};

router.post("/:id/comment", authMiddleware, blockBanned, handleCreateComment);
router.post("/:id/comments", authMiddleware, blockBanned, handleCreateComment);

router.get("/:id/comments", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("_id");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: req.params.id })
      .populate("author", "name profilePhotoUrl")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Failed to load comments" });
  }
});

router.patch("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content) {
      return res.status(400).json({ message: "Post content is required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.content = content;
    await post.save();
    const populated = await post.populate("author", "name profilePhotoUrl currentRegion userType");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update post" });
  }
});

router.delete("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Post.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post" });
  }
});

module.exports = router;
