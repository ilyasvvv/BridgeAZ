const express = require("express");
const Opportunity = require("../models/Opportunity");
const Notification = require("../models/Notification");
const OpportunityNotifyPref = require("../models/OpportunityNotifyPref");
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

const allowedNotifyTypes = new Set(["internship", "full-time", "contract", "collaboration", "other"]);
const allowedNotifyLocationModes = new Set(["remote", "hybrid", "onsite"]);

const normalizeNotifyType = (value) => {
  const token = normalizeToken(value).toLowerCase();
  if (!token) return "";
  if (token === "job" || token === "full time") return "full-time";
  if (token === "on-site") return "onsite";
  return token;
};

const normalizeNotifyLocationMode = (value) => {
  const token = normalizeToken(value).toLowerCase();
  if (!token) return "";
  if (token === "on-site") return "onsite";
  return token;
};

const normalizeNotifyTypes = (value) => {
  const values = normalizeArray(value).map((item) => normalizeNotifyType(item));
  const deduped = [...new Set(values.filter(Boolean))];
  if (deduped.some((item) => !allowedNotifyTypes.has(item))) {
    return null;
  }
  return deduped;
};

const normalizeNotifyLocationModes = (value) => {
  const values = normalizeArray(value).map((item) => normalizeNotifyLocationMode(item));
  const deduped = [...new Set(values.filter(Boolean))];
  if (deduped.some((item) => !allowedNotifyLocationModes.has(item))) {
    return null;
  }
  return deduped;
};

const matchesNotifyPrefs = (prefs, opportunity) => {
  const prefTypes = normalizeNotifyTypes(prefs.types || []) || [];
  const prefLocationModes = normalizeNotifyLocationModes(prefs.locationModes || []) || [];
  const prefCountry = normalizeToken(prefs.country).toLowerCase();
  const prefKeywords = normalizeToken(prefs.keywords).toLowerCase();
  const opportunityType = normalizeNotifyType(opportunity.type);
  const opportunityLocationMode = normalizeNotifyLocationMode(opportunity.locationMode);
  const opportunityCountry = normalizeToken(opportunity.country).toLowerCase();

  if (prefTypes.length && !prefTypes.includes(opportunityType)) {
    return false;
  }
  if (prefLocationModes.length && !prefLocationModes.includes(opportunityLocationMode)) {
    return false;
  }
  if (prefCountry && prefCountry !== opportunityCountry) {
    return false;
  }
  if (prefKeywords) {
    const haystack = [
      opportunity.title,
      opportunity.description,
      opportunity.orgName,
      opportunity.company
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(prefKeywords)) {
      return false;
    }
  }
  return true;
};

const notifyMatchingUsers = async (opportunity, actorUserId) => {
  const prefs = await OpportunityNotifyPref.find({
    userId: { $ne: actorUserId }
  }).select("userId types locationModes country keywords");

  const toCreate = prefs
    .filter((pref) => matchesNotifyPrefs(pref, opportunity))
    .map((pref) => ({
      type: "opportunity",
      userId: pref.userId,
      actorId: actorUserId,
      title: `New opportunity posted: ${opportunity.title}`,
      body: (opportunity.description || "").slice(0, 140) || "A new opportunity matches your preferences.",
      link: `/opportunities/${opportunity._id}`,
      metadata: { opportunityId: opportunity._id },
      read: false
    }));

  if (!toCreate.length) return;
  await Notification.insertMany(toCreate, { ordered: false });
};

router.get("/notify-prefs", authMiddleware, blockBanned, async (req, res) => {
  try {
    const prefs = await OpportunityNotifyPref.findOne({ userId: req.user._id });
    if (!prefs) {
      return res.json({
        userId: req.user._id,
        types: [],
        locationModes: [],
        country: "",
        keywords: ""
      });
    }
    return res.json(prefs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load notification preferences" });
  }
});

router.put("/notify-prefs", authMiddleware, blockBanned, async (req, res) => {
  try {
    const types = normalizeNotifyTypes(req.body?.types || []);
    const locationModes = normalizeNotifyLocationModes(req.body?.locationModes || []);
    if (!types) {
      return res.status(400).json({ message: "Invalid opportunity types" });
    }
    if (!locationModes) {
      return res.status(400).json({ message: "Invalid location modes" });
    }

    const payload = {
      userId: req.user._id,
      types,
      locationModes,
      country: normalizeToken(req.body?.country),
      keywords: normalizeToken(req.body?.keywords)
    };

    const prefs = await OpportunityNotifyPref.findOneAndUpdate(
      { userId: req.user._id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json(prefs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to save notification preferences" });
  }
});

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

    try {
      await notifyMatchingUsers(opportunity, req.user._id);
    } catch (notifyError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Opportunity notification fanout failed:",
          notifyError.message || notifyError
        );
      }
    }

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
