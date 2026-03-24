const mongoose = require("mongoose");

const pixelEventSchema = new mongoose.Schema(
  {
    event_name: String,
    event_time: Number,
    event_id: String,
    event_source_url: String,
    user_data: Object,
    custom_data: Object,
    status: { type: String, enum: ["pending", "failed"], default: "pending" },
    response: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PixelEvent", pixelEventSchema);
