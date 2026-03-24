const axios = require("axios");

const ECWID_STORE_ID = process.env.ECWID_STORE_ID;
const ECWID_SECRET_TOKEN = process.env.ECWID_SECRET_TOKEN;
const ECWID_API_BASE = `https://app.ecwid.com/api/v3/${ECWID_STORE_ID}`;

const ecwidHeaders = {
  Authorization: `Bearer ${ECWID_SECRET_TOKEN}`,
  "Content-Type": "application/json",
};

exports.getProducts = async (req, res) => {
  try {
    const { data } = await axios.get(`${ECWID_API_BASE}/products`, {
      headers: ecwidHeaders,
      params: req.query,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getProducts Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(`${ECWID_API_BASE}/products/${id}`, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getProduct Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { data } = await axios.get(`${ECWID_API_BASE}/categories`, {
      headers: ecwidHeaders,
      params: { limit: 1000 }
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getCategories Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

const fetchAllOrders = async (params) => {
  const { fetchAll, ...ecwidParams } = params;
  let allItems = [];
  let offset = 0;
  let total = 0;
  let fetchMore = true;

  console.log(`🚀 [ITERative FETCH] Starting for params: ${JSON.stringify(ecwidParams)}`);

  while (fetchMore) {
    const currentParams = { ...ecwidParams, offset, limit: 100 };
    console.log(`📡 [PAGE FETCH] Offset: ${offset}, Limit: 100...`);

    try {
      const { data } = await axios.get(`${ECWID_API_BASE}/orders`, {
        headers: ecwidHeaders,
        params: currentParams,
      });

      const items = data.items || [];
      allItems = [...allItems, ...items];
      total = Number(data.total);

      console.log(`✅ [PAGE FETCH] Got ${items.length} items. Total on server: ${total}. Total collected: ${allItems.length}`);

      if (allItems.length < total && items.length > 0) {
        offset += items.length;
      } else {
        fetchMore = false;
      }
    } catch (err) {
      console.error("❌ [PAGE FETCH] Error:", err.response?.data || err.message);
      fetchMore = false;
      throw err;
    }
  }

  console.log(`🏁 [ITERATIVE FETCH] Finished. Final count: ${allItems.length}`);
  return { items: allItems, total, count: allItems.length };
};

exports.getOrders = async (req, res) => {
  try {
    const query = req.query || {};
    const fetchAll = query.fetchAll;
    const limit = query.limit;

    const isFetchAll = String(fetchAll).toLowerCase() === 'true' ||
      fetchAll === true ||
      fetchAll === '1' ||
      fetchAll === 1 ||
      !limit ||
      Number(limit) > 100;

    console.log(`🔍 [GET ORDERS] limit=${limit}, fetchAll=${fetchAll} => isFetchAll=${isFetchAll}`);

    if (isFetchAll) {
      const data = await fetchAllOrders(query);
      return res.json(data);
    }

    const { data } = await axios.get(`${ECWID_API_BASE}/orders`, {
      headers: ecwidHeaders,
      params: req.query,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getOrders Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(`${ECWID_API_BASE}/orders/${id}`, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getOrder Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.put(`${ECWID_API_BASE}/orders/${id}`, req.body, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid updateOrder Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.delete(`${ECWID_API_BASE}/orders/${id}`, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid deleteOrder Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { data } = await axios.get(`${ECWID_API_BASE}/profile`, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid getProfile Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("RECEIVED ECWID WEBHOOK:", webhookData);

    // Basic validation: Ecwid webhooks usually have eventType
    if (!webhookData.eventType) {
      return res.status(400).send("Invalid webhook data");
    }

    // Process based on eventType
    switch (webhookData.eventType) {
      case "order.created":
        console.log("Order Created:", webhookData.entityId);
        break;
      case "order.updated":
        console.log("Order Updated:", webhookData.entityId);
        break;
      // Add more cases as needed
      default:
        console.log("Unhandled event type:", webhookData.eventType);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Ecwid Webhook Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};
exports.createProduct = async (req, res) => {
  try {
    const { data } = await axios.post(`${ECWID_API_BASE}/products`, req.body, {
      headers: ecwidHeaders,
    });
    res.status(201).json(data);
  } catch (error) {
    console.error("Ecwid createProduct Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.put(`${ECWID_API_BASE}/products/${id}`, req.body, {
      headers: ecwidHeaders,
      params: req.query,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid updateProduct Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.delete(`${ECWID_API_BASE}/products/${id}`, {
      headers: ecwidHeaders,
    });
    res.json(data);
  } catch (error) {
    console.error("Ecwid deleteProduct Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
};
