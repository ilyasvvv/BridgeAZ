const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Circle = require("../models/Circle");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString, FIELD_LIMITS } = require("../middleware/sanitize");
const realtime = require("../utils/realtime");

const router = express.Router();
const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");
const authorSelect =
  "name username avatarUrl photoUrl profilePhoto profilePhotoUrl profilePictureUrl currentRegion accountType isMentor headline";
const commentAuthorSelect =
  "name username avatarUrl photoUrl profilePhoto profilePhotoUrl profilePictureUrl currentRegion accountType";
const circleSelect = "name handle avatarUrl currentRegion visibility memberCount";

const isCircleAdmin = (circle, userId) => {
  const id = String(userId);
  if (String(circle.owner) === id) return true;
  return (circle.members || []).some(
    (member) =>
      String(member.userId) === id &&
      member.status === "active" &&
      ["owner", "admin"].includes(member.role)
  );
};

const isCircleMember = (circle, userId) => {
  const id = String(userId);
  if (String(circle.owner) === id) return true;
  return (circle.members || []).some(
    (member) => String(member.userId) === id && member.status === "active"
  );
};

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const region = normalizeToken(req.query.region || req.user.currentRegion);
    const visibility = region && region.toUpperCase() !== "ALL" ? ["ALL", region] : ["ALL"];

    const query = { visibilityRegion: { $in: visibility } };
    if (req.query.circleId && mongoose.Types.ObjectId.isValid(req.query.circleId)) {
      query.circle = req.query.circleId;
    }

    const posts = await Post.find(query)
      .populate("author", authorSelect)
      .populate("circle", circleSelect)
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: commentAuthorSelect }
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
    const rawContent = req.body.content;
    const {
      attachmentUrl,
      attachmentContentType,
      visibilityRegion,
      circleId,
      postedAs
    } = req.body;
    if (!rawContent) {
      return res.status(400).json({ message: "Post content is required" });
    }
    const content = sanitizeString(rawContent, FIELD_LIMITS.content);
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

    let circle = null;
    const normalizedCircleId = normalizeToken(circleId);
    if (normalizedCircleId) {
      if (!mongoose.Types.ObjectId.isValid(normalizedCircleId)) {
        return res.status(400).json({ message: "Invalid circle id" });
      }
      circle = await Circle.findById(normalizedCircleId);
      if (!circle) {
        return res.status(404).json({ message: "Circle not found" });
      }
      if (!isCircleMember(circle, req.user._id)) {
        return res.status(403).json({ message: "Join the circle before posting" });
      }
      if (postedAs === "circle" && !isCircleAdmin(circle, req.user._id)) {
        return res.status(403).json({ message: "Only circle admins can post as the circle" });
      }
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      attachmentUrl,
      attachmentContentType: normalizedContentType,
      attachmentKind,
      circle: circle?._id,
      postedAs: circle && postedAs === "circle" ? "circle" : "user",
      visibilityRegion: normalizeToken(visibilityRegion) || "ALL"
    });

    if (circle) {
      circle.postCount = (circle.postCount || 0) + 1;
      await circle.save();
    }

    const populated = await post.populate([
      { path: "author", select: authorSelect },
      { path: "circle", select: circleSelect }
    ]);
    realtime.publishToUser(req.user._id, "post:created", populated);
    if (circle) {
      realtime.publishToUsers(
        (circle.members || []).map((member) => member.userId),
        "circle:post_created",
        populated
      );
    }
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

    // Remove notification on unlike
    if (alreadyLiked) {
      await Notification.deleteOne({
        type: "post_like",
        userId: post.author,
        actorId: req.user._id,
        postId: post._id
      });
      realtime.publishToUser(post.author, "notification:deleted", {
        type: "post_like",
        actorId: req.user._id,
        postId: post._id
      });
    }

    if (!alreadyLiked && !post.author.equals(req.user._id)) {
      const preview = post.content ? post.content.slice(0, 140) : "";
      const notification = await Notification.findOneAndUpdate(
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
      realtime.publishToUser(post.author, "notification", notification);
    }
    const payload = { postId: post._id, likesCount: post.likes.length, likedByMe: !alreadyLiked };
    realtime.publishToUser(post.author, "post:liked", payload);
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
      .populate("author", authorSelect)
      .populate("circle", circleSelect)
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: commentAuthorSelect }
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
    const rawContent = req.body.content;
    if (!rawContent) {
      return res.status(400).json({ message: "Comment content is required" });
    }
    const content = sanitizeString(rawContent, FIELD_LIMITS.comment);
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
      .populate("author", authorSelect)
      .populate("circle", circleSelect)
      .populate({
        path: "comments",
        select: "author content createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "author", select: commentAuthorSelect }
      });

    const populatedComment = await comment.populate("author", commentAuthorSelect);
    if (!post.author.equals(req.user._id)) {
      const notification = await Notification.findOneAndUpdate(
        {
          type: "post_comment",
          userId: post.author,
          actorId: req.user._id,
          postId: post._id,
          "metadata.commentId": comment._id
        },
        {
          $setOnInsert: {
            type: "post_comment",
            userId: post.author,
            actorId: req.user._id,
            postId: post._id,
            title: `${req.user.name} commented on your post`,
            body: content.slice(0, 140),
            link: `/posts/${post._id}`,
            metadata: { postId: post._id, commentId: comment._id, actorName: req.user.name },
            read: false
          }
        },
        { upsert: true, new: true }
      );
      realtime.publishToUser(post.author, "notification", notification);
    }
    realtime.publishToUser(post.author, "post:commented", {
      postId: post._id,
      comment: populatedComment
    });
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
      .populate("author", commentAuthorSelect)
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Failed to load comments" });
  }
});

router.patch("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const rawContent = (req.body || {}).content;
    if (!rawContent) {
      return res.status(400).json({ message: "Post content is required" });
    }
    const content = sanitizeString(rawContent, FIELD_LIMITS.content);
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
    const populated = await post.populate([
      { path: "author", select: authorSelect },
      { path: "circle", select: circleSelect }
    ]);
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
