const express = require("express");
const router = express.Router();

router.get("/robots.txt", (req, res) => {
  res.type("text/plain");

  const content = `
User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /

Sitemap: https://www.clindoeilstore.com/sitemap.xml
`;

  res.send(content.trim());
});

module.exports = router;
