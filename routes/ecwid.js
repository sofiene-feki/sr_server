const express = require("express");
const router = express.Router();
const {
    getProducts,
    getProduct,
    getCategories,
    getOrders,
    getOrder,
    updateOrder,
    deleteOrder,
    getProfile,
    handleWebhook,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/ecwid");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Product routes
router.get("/ecwid/products", getProducts);
router.get("/ecwid/products/:id", getProduct);
router.post("/ecwid/products", protect, restrictTo("ADMIN"), createProduct);
router.put("/ecwid/products/:id", protect, restrictTo("ADMIN"), updateProduct);
router.delete("/ecwid/products/:id", protect, restrictTo("ADMIN"), deleteProduct);

// Category routes
router.get("/ecwid/categories", getCategories);

// Order routes
router.get("/ecwid/orders", protect, restrictTo("ADMIN"), getOrders);
router.get("/ecwid/orders/:id", protect, restrictTo("ADMIN"), getOrder);
router.put("/ecwid/orders/:id", protect, restrictTo("ADMIN"), updateOrder);
router.delete("/ecwid/orders/:id", protect, restrictTo("ADMIN"), deleteOrder);

// Profile route
router.get("/ecwid/profile", getProfile);

// Webhook route
router.post("/ecwid/webhooks/order-created", handleWebhook);

module.exports = router;
