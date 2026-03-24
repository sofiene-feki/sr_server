const Order = require("../models/Order");
const axios = require("axios");

// ✅ Create Order
exports.createOrder = async (req, res) => {
  try {
    let { customer, items, paymentMethod, shipping, subtotal, total } =
      req.body;

    // If items is coming as a string (FormData), parse it
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({ message: "Invalid items format" });
      }
    }

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Normalize items so packs and singles are stored correctly
    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      image: item.image,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null,
      type: item.type || "single", // default to single

      // If it's a pack, ensure nested products exist
      products:
        item.type === "pack" && Array.isArray(item.products)
          ? item.products.map((p) => ({
              productId: p.productId,
              name: p.name,
              price: p.price || 0,
              quantity: p.quantity || 1,
              selectedSize: p.selectedSize || null,
              selectedSizePrice: p.selectedSizePrice || 0,
              selectedColor: p.selectedColor || null,
            }))
          : [],
    }));

    const newOrder = new Order({
      customer,
      items: normalizedItems,
      paymentMethod,
      shipping,
      subtotal,
      total,
    });

    await newOrder.save();

    res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get All Orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("❌ Error fetching all orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g., "pending", "shipped", "delivered"

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated", order });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// exports.sendToDelivery = async (req, res) => {
//   try {
//     const orders = req.body; // expecting array of { Client, Produit }

//     if (!orders || !Array.isArray(orders) || orders.length === 0) {
//       return res.status(400).json({ message: "No orders provided" });
//     }

//     const response = await axios.post(
//       "https://www.firstdeliverygroup.com/api/v2/bulk-create",
//       orders,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.DELIVERY_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     res.status(200).json({
//       message: "Orders sent to delivery successfully",
//       data: response.data,
//     });
//   } catch (error) {
//     console.error(
//       "❌ Error sending orders to delivery:",
//       error.response?.data || error.message
//     );

//     res.status(500).json({
//       message: "Failed to send orders to delivery",
//       error: error.response?.data || error.message,
//     });
//   }
// };

exports.sendToDelivery = async (req, res) => {
  try {
    const orders = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: "No orders provided" });
    }

    const results = [];
    const errors = [];

    for (const order of orders) {
      try {
        const payload = {
          action: "add",
          code_api: process.env.DROPPEX_DEV_CODE,
          cle_api: process.env.DROPPEX_DEV_KEY,

          tel_l: order.Client.telephone,
          tel2_l: order.Client.telephone2 || "",
          nom_client: order.Client.nom,
          gov_l: order.Client.gouvernerat,
          adresse_l: order.Client.adresse,

          libelle: order.Produit.designation,
          cod: order.Produit.prix,
          nb_piece: order.Produit.nombreArticle,
          remarque: order.Produit.commentaire || "",

          service: "Livraison",
        };

        const response = await axios.post(
          process.env.DROPPEX_DEV_URL,
          payload,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 15000,
          }
        );

        results.push({
          success: true,
          code_barre: response.data?.code_barre,
          raw: response.data,
        });
      } catch (err) {
        errors.push({
          success: false,
          order,
          error: err.response?.data || err.message,
        });
      }
    }

    res.status(200).json({
      message: "Droppex sync completed",
      total: orders.length,
      successCount: results.length,
      failedCount: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("❌ Droppex bulk error:", error);
    res.status(500).json({
      message: "Droppex delivery failed",
      error: error.message,
    });
  }
};
