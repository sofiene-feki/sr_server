const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

exports.getGoogleAdsStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
        const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

        if (!customerId || !refreshToken) {
            return res.status(400).json({
                status: "fail",
                message: "Google Ads credentials not configured in .env",
            });
        }

        const customer = client.Customer({
            customer_id: customerId,
            refresh_token: refreshToken,
        });

        let dateFilter = "segments.date DURING LAST_30_DAYS";
        if (startDate && endDate) {
            // Format to YYYY-MM-DD for Google Ads API
            const start = new Date(startDate).toISOString().split('T')[0].replace(/-/g, '');
            const end = new Date(endDate).toISOString().split('T')[0].replace(/-/g, '');
            dateFilter = `segments.date BETWEEN '${start}' AND '${end}'`;
        }

        const query = `
            SELECT 
                metrics.cost_micros, 
                metrics.impressions, 
                metrics.clicks, 
                segments.date
            FROM 
                customer
            WHERE 
                ${dateFilter}
        `;

        const results = await customer.query(query);

        // Aggregate totals
        let totalCostMicros = 0;
        let totalImpressions = 0;
        let totalClicks = 0;

        results.forEach(row => {
            totalCostMicros += row.metrics.cost_micros || 0;
            totalImpressions += row.metrics.impressions || 0;
            totalClicks += row.metrics.clicks || 0;
        });

        res.status(200).json({
            status: "success",
            data: {
                totalSpend: totalCostMicros / 1000000,
                totalImpressions,
                totalClicks,
                raw: results
            },
        });
    } catch (err) {
        console.error("Google Ads API Error:", err);
        res.status(500).json({
            status: "error",
            message: err.message,
        });
    }
};
