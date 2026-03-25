const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");

const DEFAULT_VERIFICATION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

const computeLegacyStatus = (studentStatus, mentorStatus) => {
  if (studentStatus === "pending" || mentorStatus === "pending") {
    return "pending";
  }
  if (studentStatus === "approved" || mentorStatus === "approved") {
    return "verified";
  }
  if (studentStatus === "rejected" || mentorStatus === "rejected") {
    return "rejected";
  }
  return "unverified";
};

const syncVerificationStatus = async (userId) => {
  const [studentRequest, mentorRequest] = await Promise.all([
    VerificationRequest.findOne({ user: userId, requestType: "student" }).sort({ createdAt: -1 }),
    VerificationRequest.findOne({ user: userId, requestType: "mentor" }).sort({ createdAt: -1 })
  ]);

  const now = new Date();

  // Check if approved verifications have expired
  let studentStatus = studentRequest?.status || "none";
  let mentorStatus = mentorRequest?.status || "none";

  const studentExpired = studentStatus === "approved" && studentRequest.expiresAt && studentRequest.expiresAt <= now;
  const mentorExpired = mentorStatus === "approved" && mentorRequest.expiresAt && mentorRequest.expiresAt <= now;

  if (studentExpired) studentStatus = "none";
  if (mentorExpired) mentorStatus = "none";

  const studentVerified = studentStatus === "approved";
  const mentorVerified = mentorStatus === "approved";

  const updates = {
    studentVerificationStatus: studentStatus === "none" && studentExpired ? "none" : studentStatus,
    mentorVerificationStatus: mentorStatus === "none" && mentorExpired ? "none" : mentorStatus,
    studentVerified,
    mentorVerified,
    verificationStatus: computeLegacyStatus(
      studentVerified ? "approved" : studentStatus,
      mentorVerified ? "approved" : mentorStatus
    )
  };

  if (studentVerified && studentRequest) {
    updates.studentVerifiedAt = studentRequest.decisionAt || studentRequest.reviewedAt || studentRequest.updatedAt;
    updates.studentVerificationExpiresAt = studentRequest.expiresAt;
  } else if (!studentVerified) {
    updates.studentVerifiedAt = null;
    updates.studentVerificationExpiresAt = null;
  }

  if (mentorVerified && mentorRequest) {
    updates.mentorVerifiedAt = mentorRequest.decisionAt || mentorRequest.reviewedAt || mentorRequest.updatedAt;
    updates.mentorVerificationExpiresAt = mentorRequest.expiresAt;
  } else if (!mentorVerified) {
    updates.mentorVerifiedAt = null;
    updates.mentorVerificationExpiresAt = null;
  }

  if (!mentorVerified) {
    updates.isMentor = false;
  }

  await User.findByIdAndUpdate(userId, updates);
  return updates;
};

module.exports = { syncVerificationStatus, DEFAULT_VERIFICATION_DURATION_MS };
