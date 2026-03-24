const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Trop de tentatives. Veuillez réessayer dans 15 minutes.",
});

// ✅ Public Routes
router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);
router.get("/auth/verify-email/:token", authController.verifyEmail);
router.get("/auth/logout", authController.logout);
router.get("/auth/refresh", authController.refresh);
router.post("/auth/forgot-password", authController.forgotPassword);
router.patch("/auth/reset-password/:token", authController.resetPassword);

// ✅ Protected routes (individual application to avoid leakage)
router.get("/auth/me", protect, authController.getMe);
router.patch("/auth/update-password", protect, authController.updatePassword);

module.exports = router;
