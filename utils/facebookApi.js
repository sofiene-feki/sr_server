const axios = require("axios");
const crypto = require("crypto");
const PixelEvent = require("../models/PixelEvent");

const pixelId = process.env.META_PIXEL_ID;
const token = process.env.META_ACCESS_TOKEN;
const apiUrl = `${process.env.META_API_URL}/${pixelId}/events`;

// Hash helper for sensitive data
function hash(value) {
  return value ? crypto.createHash("sha256").update(value).digest("hex") : null;
}

// Send event to Meta
exports.sendEventToMeta = async (event) => {
  try {
    const payload = { data: [event], access_token: token };
    const res = await axios.post(apiUrl, payload);
    return res.data;
  } catch (err) {
    console.error("⚠️ Facebook API error:", err.response?.data || err.message);
    // Save failed event to MongoDB for retry
    await PixelEvent.create({
      ...event,
      status: "failed",
      response: err.message,
    });
    return null;
  }
};

exports.hash = hash;
