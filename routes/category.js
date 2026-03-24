const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  create,
  read,
  update,
  remove,
  list,
  getSubs,
} = require("../controllers/category");

// Multer setup for category image
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/media/category");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Routes
router.post("/category", upload.single("image"), create);
router.get("/categories", list);
router.get("/category/:slug", read);
router.put("/category/:slug", upload.single("image"), update);
router.delete("/category/:id", remove);
router.get("/category/subs/:_id", getSubs);

module.exports = router;
