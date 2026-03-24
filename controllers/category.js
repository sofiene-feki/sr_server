const Category = require("../models/category");
const Product = require("../models/product");
const Sub = require("../models/sub");
const slugify = require("slugify");
const path = require("path");
const fs = require("fs");

// 1️⃣ Create Category with optional image
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    let image = "";

    if (req.file) {
      image = `/uploads/media/category/${req.file.filename}`;
    }

    const category = new Category({
      name,
      slug: slugify(name),
      image,
    });

    await category.save();
    res.json(category);
  } catch (err) {
    console.error("Create category failed:", err);
    res.status(400).send("Create category failed");
  }
};

// 2️⃣ List all categories
exports.list = async (req, res) => {
  const categories = await Category.find({}).sort({ createdAt: -1 }).exec();
  res.json(categories);
};

// 3️⃣ Read single category with products
exports.read = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).exec();
    const products = await Product.find({ category }).populate("Category").exec();
    res.json({ category, products });
  } catch (err) {
    console.error(err);
    res.status(400).send("Category read failed");
  }
};

// 4️⃣ Update category (name + optional new image)
exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    let updateData = {
      name,
      slug: slugify(name),
    };

    // If a new image is uploaded
    if (req.file) {
      updateData.image = `/uploads/media/category/${req.file.filename}`;
    }

    const updated = await Category.findOneAndUpdate(
      { slug: req.params.slug },
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).send("Category update failed");
  }
};

// 5️⃣ Delete category
exports.remove = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send("Category not found");

    // Optionally delete image file from disk
    if (deleted.image) {
      const filePath = path.join(__dirname, "..", deleted.image);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete category image:", err);
      });
    }

    res.json(deleted);
  } catch (err) {
    console.error(err);
    res.status(400).send("Category delete failed");
  }
};

// 6️⃣ Get subcategories
exports.getSubs = (req, res) => {
  Sub.find({ parent: req.params._id }).exec((err, subs) => {
    if (err) console.error(err);
    res.json(subs);
  });
};
