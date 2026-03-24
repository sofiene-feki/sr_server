const mongoose = require("mongoose");

const marketingSpendSchema = new mongoose.Schema(
    {
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        metaAdsSpend: {
            type: Number,
            default: 0,
        },
        googleAdsSpend: {
            type: Number,
            default: 0,
        },
        otherSpend: {
            type: Number,
            default: 0,
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("MarketingSpend", marketingSpendSchema);
