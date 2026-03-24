const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const robotsRoutes = require("./routes/robots");
const globalErrorHandler = require("./middleware/errorMiddleware");

require("dotenv").config();

const { readdirSync } = require("fs");

const app = express();

// 1) GLOBAL MIDDLEWARES
// Implement CORS - MUST BE FIRST to handle preflight OPTIONS
const allowedOrigins = [
  "http://localhost:5173",
  "https://dev-env-pmc.netlify.app",
  "https://pmc-server.onrender.com", // Adding common production pattern
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 1000, // Increased for dev/test
  windowMs: 60 * 60 * 1000,
  message: "Trop de requêtes provenant de cette IP, veuillez réessayer dans une heure !",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Use custom logging for other requests
app.use((req, res, next) => {
  console.log("👉", req.method, req.originalUrl);
  next();
});

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/", robotsRoutes); // serves /robots.txt

// load routes dynamically
readdirSync("./routes").forEach((r) => {
  const routePath = path.join(__dirname, "routes", r);
  console.log(`📡 Loading route: ${r}`);
  const route = require(routePath);

  if (!route || typeof route !== "function") {
    console.error(`❌ Failed to load route ${r}. Expected a function but got:`, route);
    return;
  }

  // Mount sitemap at root, everything else under /api
  if (r === "sitemap.js") {
    app.use("/", route);
  } else {
    app.use("/api", route);
  }
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

// database
mongoose
  .connect(process.env.DATA_BASE)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
