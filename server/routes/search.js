const express = require("express");
const User = require("../models/User");
const Circle = require("../models/Circle");
const Opportunity = require("../models/Opportunity");
const Post = require("../models/Post");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 20)) : 5;

    const typesParam = typeof req.query.types === "string" ? req.query.types.split(",").map((t) => t.trim()).filter(Boolean) : ["users", "circles", "opportunities", "posts"];
    const wantUsers = typesParam.includes("users");
    const wantCircles = typesParam.includes("circles");
    const wantOpportunities = typesParam.includes("opportunities");
    const wantPosts = typesParam.includes("posts");

    const countriesParam = typeof req.query.countries === "string"
      ? req.query.countries.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const hasFilters = typesParam.length < 3 || countriesParam.length > 0;

    // Require either q>=2 or at least one narrowing filter
    if (q.length < 2 && !hasFilters) {
      return res.json({
        users: [],
        circles: [],
        opportunities: [],
        posts: [],
        counts: { users: 0, circles: 0, opportunities: 0, posts: 0 }
      });
    }

    // Tokenize q so multi-word searches match tokens in any order
    // e.g. "hello world" matches a post containing "world hello there"
    const tokens = q.length >= 2 ? q.split(/\s+/).filter((t) => t.length >= 2) : [];
    const tokenRegexes = tokens.map((t) => new RegExp(escapeRegex(t), "i"));
    const regex = q.length >= 2 ? new RegExp(escapeRegex(q), "i") : null;

    // Build queries
    const userQuery = () => {
      const filter = {
        _id: { $ne: req.user._id },
        banned: { $ne: true }
      };
      if (tokenRegexes.length) {
        // Each token must match somewhere across the searchable fields
        filter.$and = tokenRegexes.map((re) => ({
          $or: [
            { name: re },
            { headline: re },
            { skills: re },
            { "education.institution": re },
            { "experience.company": re },
            { "experience.org": re }
          ]
        }));
      }
      if (countriesParam.length) {
        filter["locationNow.country"] = { $in: countriesParam };
      }
      return filter;
    };

    const opportunityQuery = () => {
      const filter = {
        status: "open"
      };
      if (tokenRegexes.length) {
        filter.$and = tokenRegexes.map((re) => ({
          $or: [
            { title: re },
            { company: re },
            { orgName: re },
            { description: re },
            { tags: re }
          ]
        }));
      }
      if (countriesParam.length) {
        filter.country = { $in: countriesParam };
      }
      // Respect visibility
      const userRegion = req.user.currentRegion;
      if (userRegion) {
        filter.visibilityRegion = { $in: ["ALL", userRegion] };
      }
      return filter;
    };

    const circleQuery = () => {
      const filter = { visibility: { $ne: "private" } };
      if (tokenRegexes.length) {
        filter.$and = tokenRegexes.map((re) => ({
          $or: [{ name: re }, { handle: re }, { bio: re }, { currentRegion: re }]
        }));
      }
      if (countriesParam.length) {
        filter["location.country"] = { $in: countriesParam };
      }
      return filter;
    };

    const postQuery = () => {
      const filter = {};
      if (tokenRegexes.length) {
        // Every token must appear somewhere in the post content
        filter.$and = tokenRegexes.map((re) => ({ content: re }));
      }
      // Respect visibility region like the feed does
      const userRegion = req.user.currentRegion;
      if (userRegion && userRegion.toUpperCase() !== "ALL") {
        filter.visibilityRegion = { $in: ["ALL", userRegion] };
      }
      return filter;
    };

    const tasks = [];

    if (wantUsers) {
      const filter = userQuery();
      tasks.push(
        Promise.all([
          User.find(filter)
            .select("name username accountType avatarUrl profilePhotoUrl profilePictureUrl headline currentRegion locationNow education experience isMentor")
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean(),
          User.countDocuments(filter)
        ]).then(([docs, count]) => ({ key: "users", docs, count }))
      );
    } else {
      tasks.push(Promise.resolve({ key: "users", docs: [], count: 0 }));
    }

    if (wantOpportunities) {
      const filter = opportunityQuery();
      tasks.push(
        Promise.all([
          Opportunity.find(filter)
            .select("title company orgName type locationMode country city description tags status createdAt postedBy")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
          Opportunity.countDocuments(filter)
        ]).then(([docs, count]) => ({ key: "opportunities", docs, count }))
      );
    } else {
      tasks.push(Promise.resolve({ key: "opportunities", docs: [], count: 0 }));
    }

    if (wantCircles) {
      const filter = circleQuery();
      tasks.push(
        Promise.all([
          Circle.find(filter)
            .select("name handle bio currentRegion location visibility avatarUrl memberCount postCount createdAt")
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean(),
          Circle.countDocuments(filter)
        ]).then(([docs, count]) => ({ key: "circles", docs, count }))
      );
    } else {
      tasks.push(Promise.resolve({ key: "circles", docs: [], count: 0 }));
    }

    if (wantPosts) {
      const filter = postQuery();
      tasks.push(
        Promise.all([
          Post.find(filter)
            .populate("author", "name username accountType avatarUrl profilePhotoUrl profilePictureUrl currentRegion headline")
            .populate("circle", "name handle avatarUrl currentRegion")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
          Post.countDocuments(filter)
        ]).then(([docs, count]) => ({ key: "posts", docs, count }))
      );
    } else {
      tasks.push(Promise.resolve({ key: "posts", docs: [], count: 0 }));
    }

    const results = await Promise.all(tasks);

    const response = {
      users: [],
      circles: [],
      opportunities: [],
      posts: [],
      counts: { users: 0, circles: 0, opportunities: 0, posts: 0 }
    };
    for (const r of results) {
      response[r.key] = r.docs;
      response.counts[r.key] = r.count;
    }

    res.json(response);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
