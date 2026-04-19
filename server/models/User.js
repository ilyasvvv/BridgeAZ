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
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    authProviders: {
      type: [String],
      enum: ["password", "google"],
      default: []
    },
    accountType: {
      type: String,
      enum: ["personal", "circle"],
      default: "personal"
    },
    userType: {
      type: String,
      enum: ["student", "professional", "member", "circle"],
      required: true
    },
    currentRegion: { type: String, trim: true },
    roles: {
      type: [String],
      enum: ["student", "professional", "member", "circle", "mentor", "staffC", "staffB", "adminA"],
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
    studentVerifiedAt: Date,
    studentVerificationExpiresAt: Date,
    mentorVerified: { type: Boolean, default: false },
    mentorVerifiedAt: Date,
    mentorVerificationExpiresAt: Date,
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
    passwordResetTokenHash: String,
    passwordResetExpiresAt: Date,
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
    },
    qLocation: {
      country: String,
      countryCode: String,
      city: String,
      region: String,
      coordinates: { lat: Number, lng: Number },
    },
    qInterests: [String],
    qOnboarded: { type: Boolean, default: false },
    qPrivacy: {
      profileVisibility: { type: String, enum: ["everyone", "community", "connections"], default: "everyone" },
      messagePermission: { type: String, enum: ["everyone", "connections", "none"], default: "everyone" },
      locationPrecision: { type: String, enum: ["city", "region", "country"], default: "city" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
