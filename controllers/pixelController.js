const axios = require("axios");
const { sendEventToMeta, hash } = require("../utils/facebookApi");
const PixelEvent = require("../models/PixelEvent"); // to save if geo lookup fails or extra logging

// helper: split fullName into first / last
function splitName(fullName = "") {
  const parts = (fullName || "").trim().split(/\s+/);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ") || "";
  return { firstName, lastName };
}

// Optional: resolve IP -> geo using ip-api.com (free, rate-limited)
// You can replace with ipstack/ipinfo/geoip-lite or your paid provider
async function resolveGeo(ip) {
  try {
    // ip-api returns country, regionName, city, zip, lat, lon, etc.
    const r = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon`
    );
    if (r.data?.status === "success") {
      return {
        country: r.data.country,
        state: r.data.regionName,
        city: r.data.city,
        zip: r.data.zip,
        lat: r.data.lat,
        lon: r.data.lon,
      };
    }
  } catch (err) {
    // ignore geo errors, but log for debugging
    console.warn("Geo lookup failed:", err?.response?.data || err.message);
  }
  return null;
}

exports.trackEvent = async (req, res) => {
  try {
    const {
      event_name,
      customer = {},
      products = [],
      total = 0,
      event_id,
    } = req.body;

    // --- 1) extract IP and UA ---
    // If behind proxies (NGINX, Cloudflare), ensure trust proxy is configured in Express
    // e.g., app.set('trust proxy', true)
    const xff = req.headers["x-forwarded-for"];
    const ip =
      (xff && xff.split(",")[0].trim()) ||
      req.socket.remoteAddress ||
      req.ip ||
      null;
    const userAgent = req.headers["user-agent"] || "";

    // --- 2) optional geo lookup ---
    // Be mindful of rate limits — you can skip or cache results per IP.
    const geo = await resolveGeo(ip);

    // --- 3) prepare hashed user data for advanced matching ---
    const { fullName = "", phone, email } = customer;
    const { firstName, lastName } = splitName(fullName);

    const user_data = {
      em: email ? hash(email) : undefined,
      ph: phone ? hash(phone) : undefined,
      fn: firstName ? hash(firstName) : undefined,
      ln: lastName ? hash(lastName) : undefined,
      client_ip_address: ip,
      client_user_agent: userAgent,
      // optionally include location fields (Meta accepts city/state/country/zip)
      city: geo?.city,
      state: geo?.state,
      zip: geo?.zip,
      country: geo?.country,
    };

    // --- 4) prepare contents array (product enrichment) ---
    const contents = products.map((p) => ({
      id: p._id || p.id,
      quantity: p.quantity || 1,
      item_price: p.price || 0,
      category: p.category || "Unknown",
    }));

    const custom_data = {
      currency: "TND",
      value: total,
      contents,
    };

    // --- 5) build final event object for Meta CAPI ---
    const event = {
      event_name, // e.g. "Purchase"
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || undefined,
      event_source_url: req.headers.referer || req.body.event_source_url || "",
      action_source: "website",
      user_data,
      custom_data,
    };

    // --- 6) send to Meta (utils/facebookApi.sendEventToMeta handles persistence on failure) ---
    const fbResp = await sendEventToMeta(event);

    if (fbResp) {
      return res.json({ success: true, fbResp });
    } else {
      // sendEventToMeta already queued/saved for retry
      return res
        .status(202)
        .json({ success: false, message: "Event queued for retry" });
    }
  } catch (err) {
    console.error("trackEvent error:", err);
    // store the request for manual inspection if necessary
    try {
      await PixelEvent.create({
        event_name: req.body?.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: req.body?.event_id,
        event_source_url: req.headers.referer || "",
        user_data: req.body?.customer || {},
        custom_data: { products: req.body?.products, value: req.body?.total },
        status: "failed",
        response: err.message,
      });
    } catch (saveErr) {
      console.error("Failed to save PixelEvent:", saveErr);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};
