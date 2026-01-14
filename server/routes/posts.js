const express = require("express");
const Post = require("../models/Post");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const region = req.query.region || req.user.currentRegion;
    const visibility = region ? ["ALL", region] : ["ALL"];

    const posts = await Post.find({ visibilityRegion: { $in: visibility } })
      .populate("author", "name profilePhotoUrl currentRegion userType")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Failed to load posts" });
  }
});

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { content, attachmentUrl, visibilityRegion } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Post content is required" });
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      attachmentUrl,
      visibilityRegion: visibilityRegion || "ALL"
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
    res.json({ likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

router.post("/:id/comment", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({ author: req.user._id, content });
    await post.save();

    const populated = await Post.findById(req.params.id)
      .populate("author", "name profilePhotoUrl currentRegion userType")
      .populate("comments.author", "name profilePhotoUrl");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment" });
  }
});

module.exports = router;
