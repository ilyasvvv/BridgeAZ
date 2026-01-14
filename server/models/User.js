const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number,
  country: {
    type: String,
    enum: ["AZ", "TR", "US", "OTHER"],
    default: "OTHER"
  }
});

const experienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  startDate: Date,
  endDate: Date,
  description: String,
  country: {
    type: String,
    enum: ["AZ", "TR", "US", "OTHER"],
    default: "OTHER"
  }
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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    userType: { type: String, enum: ["student", "professional"], required: true },
    currentRegion: { type: String, enum: ["AZ", "TR", "US"], required: true },
    profilePhotoUrl: String,
    headline: String,
    bio: String,
    studentVerified: { type: Boolean, default: false },
    mentorVerified: { type: Boolean, default: false },
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
    links: [linkSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
