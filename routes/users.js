const express = require("express");
const userController = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes after this middleware are protected and restricted to admin
router.use(protect);
router.use(restrictTo("ADMIN"));

// ✅ Routes
router.get("/users", userController.getAllUsers);
router.post("/users/create", userController.createUser);
router.get("/users/:id", userController.getUser);
router.patch("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);

module.exports = router;
