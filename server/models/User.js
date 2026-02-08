const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number,
  country: { type: String, trim: true }
});

const experienceSchema = new mongoose.Schema({
  title: String,
  org: String,
  company: String,
  role: String,
  startDate: Date,
  endDate: Date,
  description: String,
  country: { type: String, trim: true }
});

const linkSchema = new mongoose.Schema({
  label: String,
  url: String
});

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  link: String
});

const locationSchema = new mongoose.Schema({
  country: String,
  city: String
});

const socialLinksSchema = new mongoose.Schema({
  linkedin: String,
  github: String,
  website: String
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    userType: { type: String, enum: ["student", "professional"], required: true },
    currentRegion: { type: String, trim: true },
    roles: {
      type: [String],
      enum: ["student", "professional", "mentor", "staffC", "staffB", "adminA"],
      default: []
    },
    profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
    isPrivate: { type: Boolean, default: false },
    profilePictureUrl: String,
    profilePhotoUrl: String,
    avatarUrl: String,
    resumeUrl: String,
    headline: String,
    bio: String,
    studentVerified: { type: Boolean, default: false },
    mentorVerified: { type: Boolean, default: false },
    studentVerificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none"
    },
    mentorVerificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none"
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified"
    },
    verificationNotes: String,
    isMentor: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    bannedReason: String,
    bannedAt: Date,
    education: [educationSchema],
    experience: [experienceSchema],
    projects: [projectSchema],
    skills: [String],
    links: [linkSchema],
    socialLinks: { type: socialLinksSchema, default: {} },
    locationNow: locationSchema,
    mentorshipAvailability: {
      type: String,
      enum: ["available", "busy", "off"],
      default: "available"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
