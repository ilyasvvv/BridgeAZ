const express = require("express");
const Opportunity = require("../models/Opportunity");
const { authMiddleware, blockBanned } = require("../middleware/auth");

const router = express.Router();
const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");

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

    const visibilityRegion = normalizeToken(region || req.user.currentRegion);
    if (visibilityRegion && visibilityRegion.toUpperCase() !== "ALL") {
      query.visibilityRegion = { $in: ["ALL", visibilityRegion] };
    }

    if (type) query.type = type;
    if (country) query.country = country;
    if (status) query.status = status;

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { company: searchRegex },
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

    const userRegion = normalizeToken(req.user.currentRegion);
    const allowedRegions = userRegion ? ["ALL", userRegion] : ["ALL"];
    const isAdmin = req.user.isAdmin || (req.user.roles || []).includes("adminA");
    if (!isAdmin && !allowedRegions.includes(opportunity.visibilityRegion)) {
      return res.status(403).json({ message: "Not authorized to view opportunity" });
    }

    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ message: "Failed to load opportunity" });
  }
});

router.post("/", authMiddleware, blockBanned, async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin || (req.user.roles || []).includes("adminA");
    if (!isAdmin && req.user.userType !== "professional") {
      return res.status(403).json({ message: "Only professionals can post opportunities" });
    }

    const {
      title,
      orgName,
      company,
      location,
      link,
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

    const resolvedOrgName = orgName || company;
    if (!title || !resolvedOrgName || !description) {
      return res
        .status(400)
        .json({ message: "Title, organization, and description are required" });
    }
    const normalizedVisibilityRegion = normalizeToken(visibilityRegion) || "ALL";

    const opportunity = await Opportunity.create({
      title,
      orgName: resolvedOrgName,
      company: company || resolvedOrgName,
      location: location || [city, country].filter(Boolean).join(", "),
      link: link || applyUrl,
      type,
      locationMode,
      country,
      city,
      description,
      requirements: normalizeArray(requirements),
      applyUrl,
      contactEmail,
      visibilityRegion: normalizedVisibilityRegion,
      tags: normalizeArray(tags),
      status,
      postedBy: req.user._id
    });

    res.status(201).json(opportunity);
  } catch (error) {
    res.status(500).json({ message: "Failed to create opportunity" });
  }
});

const ensureOwner = (opportunity, userId) => opportunity.postedBy?.equals(userId);

router.patch("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    if (!ensureOwner(opportunity, req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updates = { ...req.body };
    delete updates.postedBy;
    const updated = await Opportunity.findByIdAndUpdate(req.params.id, updates, {
      new: true
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update opportunity" });
  }
});

router.patch("/:id/close", authMiddleware, blockBanned, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    if (!ensureOwner(opportunity, req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    opportunity.status = "closed";
    await opportunity.save();
    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ message: "Failed to close opportunity" });
  }
});

router.delete("/:id", authMiddleware, blockBanned, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    if (!ensureOwner(opportunity, req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Opportunity.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete opportunity" });
  }
});

module.exports = router;
