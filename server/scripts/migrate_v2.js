require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const VerificationRequest = require("../models/VerificationRequest");
const Opportunity = require("../models/Opportunity");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Connection = require("../models/Connection");
const Mentorship = require("../models/Mentorship");
const { syncVerificationStatus } = require("../utils/verification");

const deriveVerificationStatus = (user, type) => {
  if (type === "student") {
    if (user.studentVerified) return "approved";
    if (user.verificationStatus === "pending") return "pending";
    if (user.verificationStatus === "verified") return "approved";
    if (user.verificationStatus === "rejected") return "rejected";
  }
  if (type === "mentor") {
    if (user.mentorVerified) return "approved";
    if (user.verificationStatus === "pending") return "pending";
    if (user.verificationStatus === "verified") return "approved";
    if (user.verificationStatus === "rejected") return "rejected";
  }
  return "pending";
};

const isStudentLike = (user) => {
  if (user.userType === "student") return true;
  if (user.studentVerified) return true;
  if (Array.isArray(user.education) && user.education.length > 0) return true;
  return false;
};

const ensureRoles = async (user) => {
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return;
  }
  const roles = [];
  if (isStudentLike(user)) {
    roles.push("student");
  }
  await User.updateOne({ _id: user._id }, { $set: { roles } });
};

const ensureProfileVisibility = async (user) => {
  if (!user.profileVisibility) {
    await User.updateOne({ _id: user._id }, { $set: { profileVisibility: "public" } });
  }
};

const ensureVerificationRequest = async (user, type, status) => {
  const existing = await VerificationRequest.findOne({
    user: user._id,
    requestType: type
  }).lean();
  if (existing) {
    return;
  }
  await VerificationRequest.create({
    user: user._id,
    requestType: type,
    documentUrl: user.verificationDocumentUrl || "legacy",
    status
  });
};

const migrateUsers = async () => {
  const cursor = User.find().cursor();
  for await (const user of cursor) {
    await Promise.all([ensureRoles(user), ensureProfileVisibility(user)]);

    if (user.userType === "student" && user.verificationStatus !== "unverified") {
      await ensureVerificationRequest(user, "student", deriveVerificationStatus(user, "student"));
    }
    if (user.studentVerified) {
      await ensureVerificationRequest(user, "student", "approved");
    }
    if (user.isMentor || user.mentorVerified) {
      await ensureVerificationRequest(user, "mentor", deriveVerificationStatus(user, "mentor"));
    }

    await syncVerificationStatus(user._id);
  }
};

const migrateComments = async () => {
  const posts = await Post.find().lean();
  for (const post of posts) {
    if (!Array.isArray(post.comments) || post.comments.length === 0) {
      continue;
    }
    for (const comment of post.comments) {
      if (!comment?.author || !comment?.content) {
        continue;
      }
      const createdAt = comment.createdAt || post.createdAt || new Date();
      await Comment.updateOne(
        {
          post: post._id,
          author: comment.author,
          content: comment.content,
          createdAt
        },
        {
          $setOnInsert: {
            post: post._id,
            author: comment.author,
            content: comment.content,
            createdAt
          }
        },
        { upsert: true }
      );
    }
  }
};

const syncIndexes = async () => {
  await Promise.all([
    User.syncIndexes(),
    VerificationRequest.syncIndexes(),
    Opportunity.syncIndexes(),
    Post.syncIndexes(),
    Comment.syncIndexes(),
    Notification.syncIndexes(),
    Connection.syncIndexes(),
    Mentorship.syncIndexes()
  ]);
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  await mongoose.connect(process.env.MONGO_URI);

  await syncIndexes();
  await migrateUsers();
  await migrateComments();

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Migration failed", error);
  process.exitCode = 1;
});
