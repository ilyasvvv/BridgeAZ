const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const https = require("https");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, blockBanned } = require("../middleware/auth");
const { sanitizeString, FIELD_LIMITS } = require("../middleware/sanitize");

const router = express.Router();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

const requestJson = (urlString, { method = "GET", headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const request = https.request(
      url,
      {
        method,
        headers
      },
      (response) => {
        let raw = "";

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          let parsed = {};

          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch (error) {
            return reject(new Error("Invalid JSON response from upstream service"));
          }

          if (response.statusCode >= 400) {
            const error = new Error(parsed.error_description || parsed.message || "Request failed");
            error.statusCode = response.statusCode;
            error.payload = parsed;
            return reject(error);
          }
          return resolve(parsed);
        });
      }
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const normalizeSignupType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["circle", "community"].includes(normalized)) {
    return { accountType: "circle", userType: "circle", role: "circle" };
  }

  if (["student", "professional", "personal", "person", "member"].includes(normalized)) {
    return { accountType: "personal", userType: normalized === "student" || normalized === "professional" ? normalized : "member", role: normalized === "student" || normalized === "professional" ? normalized : "member" };
  }

  return null;
};

const buildSafeUser = (user) => {
  const safeUser = user.toObject();
  safeUser.accountType = safeUser.accountType || (safeUser.userType === "circle" ? "circle" : "personal");
  delete safeUser.passwordHash;
  delete safeUser.passwordResetTokenHash;
  delete safeUser.passwordResetExpiresAt;
  return safeUser;
};

const withProvider = (providers = [], provider) =>
  Array.from(new Set([...(Array.isArray(providers) ? providers : []), provider]));

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");

const verifyGoogleCredential = async (credential) => {
  const payload = await requestJson(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google client mismatch");
  }

  if (payload.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  return payload;
};

const getPublicAppUrl = (req) => {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || req.headers.origin;
  return (configuredUrl || "http://localhost:5173").replace(/\/+$/, "");
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    return false;
  }

  const payload = {
    from: process.env.MAIL_FROM,
    to: [to],
    subject: "Reset your BridgeAZ password",
    text: `Hi ${name || "there"},\n\nUse this link to reset your BridgeAZ password:\n${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Hi ${name || "there"},</p><p>Use this link to reset your BridgeAZ password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
  };

  await requestJson("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return true;
};

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      accountType: user.accountType || "personal",
      userType: user.userType,
      currentRegion: user.currentRegion,
      studentVerified: user.studentVerified,
      mentorVerified: user.mentorVerified,
      isAdmin: user.isAdmin,
      banned: user.banned
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

router.post("/register", async (req, res) => {
  try {
    const rawName = req.body.name;
    const { email, password, userType, accountType, currentRegion } = req.body;
    const name = sanitizeString(rawName, FIELD_LIMITS.name);
    const normalizedEmail = normalizeEmail(email);
    const signupType = normalizeSignupType(accountType || userType);

    if (!name || !normalizedEmail || !password || !signupType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      authProviders: ["password"],
      accountType: signupType.accountType,
      userType: signupType.userType,
      currentRegion: (currentRegion || "").trim(),
      roles: [signupType.role],
      studentVerified: false,
      mentorVerified: false,
      verificationStatus: "unverified"
    });

    const token = signToken(user);
    res.status(201).json({ token, user: buildSafeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.banned) {
      return res.status(403).json({ message: "Your account has been banned." });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: "Use Google sign-in for this account or reset your password." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    res.json({ token, user: buildSafeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential, userType, accountType, currentRegion } = req.body || {};
    const signupType = normalizeSignupType(accountType || userType);

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleProfile = await verifyGoogleCredential(credential);
    const email = normalizeEmail(googleProfile.email);
    let user = await User.findOne({ email });

    if (user) {
      if (user.banned) {
        return res.status(403).json({ message: "Your account has been banned." });
      }

      if (user.googleId && user.googleId !== googleProfile.sub) {
        return res.status(409).json({ message: "This Google account does not match the registered user." });
      }

      user.googleId = googleProfile.sub;
      user.authProviders = withProvider(user.authProviders, "google");
      if (!user.profilePictureUrl && googleProfile.picture) {
        user.profilePictureUrl = googleProfile.picture;
      }
      if (!user.avatarUrl && googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
      }
      await user.save();
    } else {
      if (!signupType) {
        return res.status(400).json({
          code: "ACCOUNT_TYPE_REQUIRED",
          message: "Choose personal account or circle to create your Google account."
        });
      }

      user = await User.create({
        name: googleProfile.name || email.split("@")[0],
        email,
        googleId: googleProfile.sub,
        authProviders: ["google"],
        accountType: signupType.accountType,
        userType: signupType.userType,
        currentRegion: (currentRegion || "").trim(),
        roles: [signupType.role],
        profilePictureUrl: googleProfile.picture || "",
        avatarUrl: googleProfile.picture || "",
        studentVerified: false,
        mentorVerified: false,
        verificationStatus: "unverified"
      });
    }

    const token = signToken(user);
    res.json({ token, user: buildSafeUser(user) });
  } catch (error) {
    const message =
      error?.statusCode === 400
        ? "Google sign-in could not be verified"
        : "Google sign-in failed";
    res.status(401).json({ message });
  }
});

router.post("/forgot-password", async (req, res) => {
  const genericMessage = "If that email is registered, password reset instructions are on the way.";

  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.banned) {
      return res.json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    const resetUrl = `${getPublicAppUrl(req)}/reset-password?token=${rawToken}`;
    let deliveryConfigured = false;

    try {
      deliveryConfigured = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Password reset email failed", error.message);
      }
    }

    const payload = { message: genericMessage };
    // Never expose resetUrl in API response (log it for dev instead)
    if (!deliveryConfigured && process.env.NODE_ENV !== "production") {
      console.log("[DEV] Password reset URL:", resetUrl);
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Could not start password reset" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    if (user.banned) {
      return res.status(403).json({ message: "Your account has been banned." });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.authProviders = withProvider(user.authProviders, "password");
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    const signedToken = signToken(user);
    return res.json({
      message: "Password reset successful",
      token: signedToken,
      user: buildSafeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Password reset failed" });
  }
});

router.get("/me", authMiddleware, blockBanned, (req, res) => {
  res.json(req.user);
});

module.exports = router;
