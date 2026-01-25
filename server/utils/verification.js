const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");

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

  const studentStatus = studentRequest?.status || "none";
  const mentorStatus = mentorRequest?.status || "none";

  const updates = {
    studentVerificationStatus: studentStatus,
    mentorVerificationStatus: mentorStatus,
    studentVerified: studentStatus === "approved",
    mentorVerified: mentorStatus === "approved",
    verificationStatus: computeLegacyStatus(studentStatus, mentorStatus)
  };

  await User.findByIdAndUpdate(userId, updates);
  return updates;
};

module.exports = { syncVerificationStatus };
