const express = require("express");
const router = express.Router();

const Product = require("../models/product");
const Category = require("../models/category");

// Utility to escape XML special characters
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400"); // cache 1 day

    const products = await Product.find({}, "slug updatedAt");
    const categories = await Category.find({}, "slug updatedAt");

    // Static top-level pages
    const staticPages = [
      { loc: "/", lastmod: new Date().toISOString() },
      { loc: "/about", lastmod: new Date().toISOString() },
      { loc: "/contact", lastmod: new Date().toISOString() },
      { loc: "/shop", lastmod: new Date().toISOString() },
      { loc: "/terms-of-service", lastmod: new Date().toISOString() },
      { loc: "/returns-refunds", lastmod: new Date().toISOString() },
      { loc: "/privacy-policy", lastmod: new Date().toISOString() },
    ];

    const urls = [
      // Add static pages
      ...staticPages.map(
        (p) => `<url>
    <loc>https://www.clindoeilstore.com${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    </url>`
      ),

      // Add categories
      ...categories.map(
        (c) => `<url>
    <loc>https://www.clindoeilstore.com/category/${escapeXml(c.slug)}</loc>
    <lastmod>${new Date(c.updatedAt).toISOString()}</lastmod>
    </url>`
      ),

      // Add products
      ...products.map(
        (p) => `<url>
    <loc>https://www.clindoeilstore.com/product/${escapeXml(p.slug)}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>
    </url>`
      ),
    ].join("");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
    </urlset>`;

    res.send(sitemap);
  } catch (error) {
    console.error("❌ Sitemap error:", error);
    res.status(500).send("Sitemap generation failed");
  }
});

module.exports = router;
