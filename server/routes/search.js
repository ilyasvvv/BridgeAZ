const express = require("express");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Post = require("../models/Post");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      return res.json({ users: [], opportunities: [], posts: [], counts: { users: 0, opportunities: 0, posts: 0 } });
    }

    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 20)) : 5;

    const typesParam = typeof req.query.types === "string" ? req.query.types.split(",").map((t) => t.trim()).filter(Boolean) : ["users", "opportunities", "posts"];
    const wantUsers = typesParam.includes("users");
    const wantOpportunities = typesParam.includes("opportunities");
    const wantPosts = typesParam.includes("posts");

    const countriesParam = typeof req.query.countries === "string"
      ? req.query.countries.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const regex = new RegExp(escapeRegex(q), "i");

    // Build queries
    const userQuery = () => {
      const filter = {
        _id: { $ne: req.user._id },
        banned: { $ne: true },
        $or: [
          { name: regex },
          { headline: regex },
          { skills: regex },
          { "education.institution": regex },
          { "experience.company": regex },
          { "experience.org": regex }
        ]
      };
      if (countriesParam.length) {
        filter["locationNow.country"] = { $in: countriesParam };
      }
      return filter;
    };

    const opportunityQuery = () => {
      const filter = {
        status: "open",
        $or: [
          { title: regex },
          { company: regex },
          { orgName: regex },
          { description: regex },
          { tags: regex }
        ]
      };
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

    const postQuery = () => {
      const filter = { content: regex };
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
            .select("name avatarUrl profilePhotoUrl profilePictureUrl headline currentRegion locationNow userType education experience studentVerified mentorVerified isMentor")
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

    if (wantPosts) {
      const filter = postQuery();
      tasks.push(
        Promise.all([
          Post.find(filter)
            .populate("author", "name avatarUrl profilePhotoUrl profilePictureUrl")
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

    const response = { users: [], opportunities: [], posts: [], counts: { users: 0, opportunities: 0, posts: 0 } };
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
