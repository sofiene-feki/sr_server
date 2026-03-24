const MarketingSpend = require("../models/MarketingSpend");

exports.getAllSpend = async (req, res) => {
    try {
        const spends = await MarketingSpend.find().sort({ startDate: -1 });
        res.status(200).json({
            status: "success",
            data: spends,
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.createOrUpdateSpend = async (req, res) => {
    try {
        const { startDate, endDate, metaAdsSpend, googleAdsSpend, otherSpend, notes } = req.body;

        const sD = new Date(startDate);
        const eD = new Date(endDate);
        sD.setHours(0, 0, 0, 0);
        eD.setHours(23, 59, 59, 999);

        const spend = await MarketingSpend.create({
            startDate: sD,
            endDate: eD,
            metaAdsSpend,
            googleAdsSpend,
            otherSpend,
            notes
        });

        res.status(200).json({
            status: "success",
            data: spend,
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getSpendStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            // Interval logic: records that overlap with the requested period
            // For simplicity, let's just find records where startDate is within range
            // or the record covers part of the range.
            filter.startDate = { $gte: start, $lte: end };
        }

        const stats = await MarketingSpend.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalMeta: { $sum: "$metaAdsSpend" },
                    totalGoogle: { $sum: "$googleAdsSpend" },
                    totalOther: { $sum: "$otherSpend" },
                    totalSpend: { $sum: { $add: ["$metaAdsSpend", "$googleAdsSpend", "$otherSpend"] } }
                }
            }
        ]);

        res.status(200).json({
            status: "success",
            data: stats[0] || { totalMeta: 0, totalGoogle: 0, totalOther: 0, totalSpend: 0 },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};
