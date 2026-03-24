const express = require("express");
const router = express.Router();
const { trackEvent } = require("../controllers/pixelController");

// POST /api/pixel/track
router.post("/pixel/track", trackEvent);

module.exports = router;
