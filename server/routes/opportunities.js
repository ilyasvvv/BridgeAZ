const express = require("express");
const Opportunity = require("../models/Opportunity");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();

const normalizeArray = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

router.get("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const { search, region, type, country, status } = req.query;
    const query = {};

    const visibilityRegion = region || req.user.currentRegion;
    if (visibilityRegion === "ALL") {
      query.visibilityRegion = "ALL";
    } else if (visibilityRegion) {
      query.visibilityRegion = { $in: ["ALL", visibilityRegion] };
    }

    if (type) query.type = type;
    if (country) query.country = country;
    if (status) query.status = status;

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { orgName: searchRegex },
        { description: searchRegex }
      ];
    }

    const opportunities = await Opportunity.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ message: "Failed to load opportunities" });
  }
});

router.get("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    const allowedRegions = ["ALL", req.user.currentRegion];
    if (!req.user.isAdmin && !allowedRegions.includes(opportunity.visibilityRegion)) {
      return res.status(403).json({ message: "Not authorized to view opportunity" });
    }

    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ message: "Failed to load opportunity" });
  }
});

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.userType !== "professional") {
      return res.status(403).json({ message: "Only professionals can post opportunities" });
    }

    const {
      title,
      orgName,
      type,
      locationMode,
      country,
      city,
      description,
      requirements,
      applyUrl,
      contactEmail,
      visibilityRegion,
      tags,
      status
    } = req.body;

    if (!title || !orgName || !description) {
      return res
        .status(400)
        .json({ message: "Title, organization, and description are required" });
    }

    const opportunity = await Opportunity.create({
      title,
      orgName,
      type,
      locationMode,
      country,
      city,
      description,
      requirements: normalizeArray(requirements),
      applyUrl,
      contactEmail,
      visibilityRegion,
      tags: normalizeArray(tags),
      status,
      postedBy: req.user._id
    });

    res.status(201).json(opportunity);
  } catch (error) {
    res.status(500).json({ message: "Failed to create opportunity" });
  }
});

module.exports = router;
