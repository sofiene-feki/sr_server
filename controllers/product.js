const Product = require("../models/product");
const slugify = require("slugify");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// helper to delete old files
const deleteFile = async (filePath) => {
  try {
    if (filePath)
      await fs.promises.unlink(path.join(__dirname, "..", filePath));
  } catch (err) {
    console.error("Error deleting file:", filePath, err.message);
  }
};

// CREATE PRODUCT
exports.create = async (req, res) => {
  try {
    const { body, files } = req;

    // 1️⃣ Parse JSON strings into objects if necessary
    ["colors", "sizes", "ficheTech"].forEach((key) => {
      if (body[key] && typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch (err) {
          console.error(`Failed to parse ${key}:`, err);
          body[key] = []; // default empty array if parsing fails
        }
      }
    });

    // 2️⃣ Ensure numbers are cast properly
    body.Price = Number(body.Price) || 0;
    body.Promotion = Number(body.Promotion) || 0;
    body.Quantity = Number(body.Quantity) || 0;
    body.sold = Number(body.sold) || 0;

    // 3️⃣ Ensure sizes.price is a number
    if (Array.isArray(body.sizes)) {
      body.sizes = body.sizes.map((s) => ({
        ...s,
        price: Number(s.price) || 0,
      }));
    }

    // 4️⃣ Handle media files
    const media = [];
    if (files?.mediaFiles) {
      files.mediaFiles.forEach((f) => {
        media.push({
          src: `/uploads/media/${f.filename}`,
          type: f.mimetype.startsWith("image") ? "image" : "video",
          alt: f.originalname,
        });
      });
    }

    // 5️⃣ Handle color files if you upload them separately
    if (files?.colorFiles) {
      body.colors.forEach((color, i) => {
        if (files.colorFiles[i]) {
          color.src = `/uploads/media/${files.colorFiles[i].filename}`;
        }
      });
    }
    // 6️⃣ Create the product
    const newProduct = new Product({
      ...body,
      slug: slugify(body.Title),
      media,
    });

    const saved = await newProduct.save();
    res.json(saved);
  } catch (err) {
    console.error("Product creation error:", err);
    res.status(400).json({ error: err.message });
  }
};

// READ PRODUCT
exports.read = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE PRODUCT
exports.update = async (req, res) => {
  try {
    const { body } = req;
    const files = Array.isArray(req.files) ? req.files : [];

    // --------------------------------------------------
    // 1️⃣ Normalize files from upload.any()
    // --------------------------------------------------
    const mediaFiles = [];
    const colorFilesMap = {};

    files.forEach((file) => {
      // media gallery
      if (file.fieldname === "mediaFiles") {
        mediaFiles.push(file);
      }

      // color images: colorFiles[0], colorFiles[1]...
      const match = file.fieldname.match(/^colorFiles\[(\d+)\]$/);
      if (match) {
        colorFilesMap[Number(match[1])] = file;
      }
    });

    // --------------------------------------------------
    // 2️⃣ Find existing product
    // --------------------------------------------------
    const existing = await Product.findOne({ slug: req.params.slug });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    // --------------------------------------------------
    // 3️⃣ Safe JSON parsing
    // --------------------------------------------------
    const parseJSON = (value, fallback = []) => {
      if (!value) return fallback;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return value;
    };

    body.colors = parseJSON(body.colors);
    body.sizes = parseJSON(body.sizes);
    body.existingMediaIds = parseJSON(body.existingMediaIds);

    // normalize size prices
    if (Array.isArray(body.sizes)) {
      body.sizes = body.sizes.map((s) => ({
        ...s,
        price: Number(s.price) || 0,
      }));
    }

    // --------------------------------------------------
    // 4️⃣ Handle colors (preserve old images if not replaced)
    // --------------------------------------------------
    if (Array.isArray(body.colors)) {
      body.colors.forEach((color, index) => {
        // new uploaded color image
        if (colorFilesMap[index]) {
          color.src = `/uploads/others/${colorFilesMap[index].filename}`;
          color.alt = colorFilesMap[index].originalname;
        }
        // preserve existing image
        else if (color._id) {
          const oldColor = existing.colors.find(
            (c) => c._id.toString() === color._id,
          );
          if (oldColor) {
            color.src = oldColor.src;
            color.alt = oldColor.alt;
          }
        }
      });
    }

    // --------------------------------------------------
    // 5️⃣ Handle media gallery
    // --------------------------------------------------
    const keptMedia = (existing.media || []).filter((m) =>
      body.existingMediaIds?.includes(m._id.toString()),
    );

    const removedMedia = (existing.media || []).filter(
      (m) => !body.existingMediaIds?.includes(m._id.toString()),
    );

    // delete removed files from disk
    for (const m of removedMedia) {
      if (m.src) {
        await deleteFile(m.src);
      }
    }

    const newMedia = mediaFiles.map((f) => ({
      src: `/uploads/media/${f.filename}`,
      type: f.mimetype.startsWith("image") ? "image" : "video",
      alt: f.originalname,
    }));

    body.media = [...keptMedia, ...newMedia];

    // --------------------------------------------------
    // 6️⃣ Update slug if title changed
    // --------------------------------------------------
    if (body.Title) {
      body.slug = slugify(body.Title);
    }

    // --------------------------------------------------
    // 7️⃣ Update product
    // --------------------------------------------------
    const updated = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      body,
      { new: true, runValidators: true },
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE PRODUCT
exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ slug: req.params.slug });
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Deleted successfully", product: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LIST PRODUCTS with filters/pagination
exports.list = async (req, res) => {
  try {
    console.log("📥 Request body:", req.body);

    let { page = 0, itemsPerPage = 12, filters = {}, sort = "new" } = req.body;

    page = parseInt(page);
    itemsPerPage = parseInt(itemsPerPage);

    if (isNaN(page) || page < 0) page = 0;
    if (isNaN(itemsPerPage) || itemsPerPage < 1) itemsPerPage = 12;

    const skip = page * itemsPerPage;

    const sortCriteria = (() => {
      switch (sort) {
        case "best":
          return { sold: -1 };
        case "Price: Low to High":
          return { Price: 1 };
        case "Price: High to Low":
          return { Price: -1 };
        case "new":
        default:
          return { createdAt: -1 };
      }
    })();

    const appliedFilters = filters.selected || filters;
    const query = {};

    Object.keys(appliedFilters).forEach((key) => {
      const value = appliedFilters[key];

      if (!Array.isArray(value) || !value.length) return;

      // PRICE RANGE
      if (key === "priceRange" && value.length === 2) {
        query.Price = { $gte: value[0], $lte: value[1] };
        return;
      }

      // CATEGORY (single string in DB, multiple from client)
      if (key === "category") {
        query.Category = {
          $in: value.map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
        return;
      }

      // OTHER FILTERS
      const fieldMap = {
        color: "colors.name",
        size: "sizes.name",
      };

      const dbField = fieldMap[key] || key;
      query[dbField] = { $in: value };
    });

    const products = await Product.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(itemsPerPage);

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / itemsPerPage);

    res.json({ products, totalPages, total, currentPage: page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/products/category/:Category
// GET /api/products/category/:category
// controllers/productController.js

exports.getProductsByCategory = async (req, res) => {
  try {
    const categoryParam = req.params.category?.trim();
    if (!categoryParam) {
      return res.status(400).json({ message: "Category is required" });
    }

    let { page = 0, itemsPerPage = 12, sort = "new", filters = {} } = req.body;

    page = parseInt(page);
    itemsPerPage = parseInt(itemsPerPage);

    if (isNaN(page) || page < 0) page = 0;
    if (isNaN(itemsPerPage) || itemsPerPage < 1) itemsPerPage = 12;

    const skip = page * itemsPerPage;

    const sortCriteria = (() => {
      switch (sort) {
        case "best":
          return { sold: -1 };
        case "Price: Low to High":
          return { Price: 1 };
        case "Price: High to Low":
          return { Price: -1 };
        case "new":
        default:
          return { createdAt: -1 };
      }
    })();

    const appliedFilters = filters.selected || filters;

    const query = {
      Category: { $regex: `^${categoryParam}$`, $options: "i" },
    };

    Object.keys(appliedFilters).forEach((key) => {
      const value = appliedFilters[key];

      if (!Array.isArray(value) || !value.length) return;

      if (key === "priceRange" && value.length === 2) {
        query.Price = { $gte: value[0], $lte: value[1] };
        return;
      }

      const fieldMap = { color: "colors.name", size: "sizes.name" };
      const dbField = fieldMap[key] || key;

      query[dbField] = { $in: value };
    });

    const products = await Product.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(itemsPerPage);

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / itemsPerPage);

    res.json({ products, total, totalPages, currentPage: page });
  } catch (err) {
    console.error("❌ Error fetching products by category:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

exports.getNewArrivals = async (req, res) => {
  const { filter } = req.params; // ✅ extract category from params

  try {
    const query =
      filter && filter !== "all"
        ? { Category: filter } // match only the given category
        : {}; // if no category or "all", return from all categories

    // Fetch latest 4 products in this category
    const products = await Product.find(query)
      .sort({ updatedAt: -1 }) // newest first
      .limit(4);

    res.json({ products });
  } catch (err) {
    console.error("❌ Error fetching new arrivals:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getBestSellers = async (req, res) => {
  try {
    // Fetch latest 5 products
    const products = await Product.find({})
      .sort({ sold: -1 }) // newest first
      .limit(4);

    res.json({ products });
  } catch (err) {
    console.error("❌ Error fetching new arrivals:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Search products by title or description
exports.search = async (req, res) => {
  try {
    const { query = "", page = 0, itemsPerPage = 12 } = req.body;

    // Parse numbers safely
    const currentPage = parseInt(page) || 0;
    const limit = parseInt(itemsPerPage) || 12;
    const skip = currentPage * limit;

    // Escape special regex characters to prevent crashes and ensure partial matches
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedQuery, "i");

    const filter = {
      $or: [
        { Title: searchRegex },
        { Description: searchRegex },
        { Category: searchRegex },
        { subCategory: searchRegex },
        { slug: searchRegex },
      ],
    };

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({ products, total, totalPages, currentPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// controllers/productController.js
exports.getAllProductTitles = async (req, res) => {
  try {
    const products = await Product.find({}, "Title slug sizes colors");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Get single product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("❌ Error fetching product by slug:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Set product of the year
exports.setProductOfTheYear = async (req, res) => {
  try {
    const { slug } = req.params;

    // reset previous product of the year
    await Product.updateMany(
      { isProductOfTheYear: true },
      { $set: { isProductOfTheYear: false } },
    );

    // set the new one
    const product = await Product.findOneAndUpdate(
      { slug },
      { $set: { isProductOfTheYear: true } },
      { new: true },
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ success: true, product });
  } catch (error) {
    console.error("❌ Error setting product of the year:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get product of the year
exports.getProductOfTheYear = async (req, res) => {
  try {
    const product = await Product.findOne({ isProductOfTheYear: true });

    if (!product) {
      return res.status(404).json({ message: "No product of the year found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductFilters = async (req, res) => {
  try {
    // Get distinct colors
    const colors = await Product.distinct("colors.name"); // if color is a string
    // Or if it's an array of objects: Product.distinct("colors.name")

    // Get distinct sizes
    const sizes = await Product.distinct("sizes.name"); // if size is a string
    // Or if sizes are inside an array: Product.distinct("sizes")

    res.json({ colors, sizes });
  } catch (error) {
    console.error("Error fetching product filters:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
