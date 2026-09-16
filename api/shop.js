/**
 * Vercel Serverless Function: /api/shop
 * à¸—à¸³à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹€à¸›à¹‡à¸™ REST API à¹à¸—à¸™ Google Apps Script
 * à¸£à¸­à¸‡à¸£à¸±à¸šà¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸š Supabase REST API à¹à¸¥à¸°à¸¡à¸µà¹‚à¸«à¸¡à¸” In-Memory Store à¸ªà¸³à¸«à¸£à¸±à¸šà¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ
 */

// In-Memory Persistent Store (à¸„à¸‡à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™ Worker Lifecycle à¸šà¸™ Vercel)
let memoryProducts = [
  {
    id: "P001",
    name: "à¸„à¸¸à¸à¸à¸µà¹‰à¹€à¸™à¸¢à¸ªà¸” à¸Šà¹‡à¸­à¸à¹‚à¸à¹à¸¥à¸•à¸Šà¸´à¸ž (à¸à¸µà¸¡à¸·à¸­à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™)",
    category: "à¸‡à¸²à¸™à¸„à¸«à¸à¸£à¸£à¸¡/à¹€à¸šà¹€à¸à¸­à¸£à¸µà¹ˆ",
    price: 35,
    stock: 30,
    description: "à¸„à¸¸à¸à¸à¸µà¹‰à¸«à¸­à¸¡à¹€à¸™à¸¢à¹à¸—à¹‰ à¸à¸£à¸­à¸šà¸­à¸£à¹ˆà¸­à¸¢ à¸œà¸¥à¸‡à¸²à¸™à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™à¹à¸œà¸™à¸à¸„à¸«à¸à¸£à¸£à¸¡ à¸­à¸šà¸ªà¸”à¹ƒà¸«à¸¡à¹ˆà¸—à¸¸à¸à¸§à¸±à¸™",
    image_url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P002",
    name: "à¸œà¸±à¸à¸ªà¸¥à¸±à¸”à¹„à¸®à¹‚à¸”à¸£à¹‚à¸›à¸™à¸´à¸à¸ªà¹Œ à¸›à¸¥à¸­à¸”à¸ªà¸²à¸£à¹€à¸„à¸¡à¸µ",
    category: "à¸‡à¸²à¸™à¹€à¸à¸©à¸•à¸£/à¸œà¸¥à¸œà¸¥à¸´à¸•",
    price: 30,
    stock: 25,
    description: "à¸œà¸±à¸à¸ªà¸¥à¸±à¸”à¸à¸£à¸µà¸™à¹‚à¸­à¹Šà¸„-à¹€à¸£à¸”à¹‚à¸­à¹Šà¸„ à¸ªà¸” à¸à¸£à¸­à¸š à¸ªà¸°à¸­à¸²à¸” à¸›à¸¥à¸¹à¸à¹‚à¸”à¸¢à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™à¸Šà¸¡à¸£à¸¡à¹€à¸à¸©à¸•à¸£à¸­à¸´à¸™à¸—à¸£à¸µà¸¢à¹Œ",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P003",
    name: "à¸à¸£à¸°à¹€à¸›à¹‹à¸²à¸œà¹‰à¸²à¸£à¸±à¸à¸©à¹Œà¹‚à¸¥à¸ à¸¥à¸²à¸¢à¹€à¸žà¹‰à¸™à¸—à¹Œà¹à¸®à¸™à¸”à¹Œà¹€à¸¡à¸”",
    category: "à¸‡à¸²à¸™à¸Šà¹ˆà¸²à¸‡/à¸‡à¸²à¸™à¸›à¸£à¸°à¸”à¸´à¸©à¸à¹Œ",
    price: 79,
    stock: 15,
    description: "à¸à¸£à¸°à¹€à¸›à¹‹à¸²à¸œà¹‰à¸²à¹à¸„à¸™à¸§à¸²à¸ªà¸­à¸¢à¹ˆà¸²à¸‡à¸”à¸µ à¹€à¸žà¹‰à¸™à¸—à¹Œà¸¥à¸²à¸¢à¸¨à¸´à¸¥à¸›à¸°à¸›à¸£à¸°à¸”à¸´à¸©à¸à¹Œà¹ƒà¸šà¸•à¹ˆà¸­à¹ƒà¸š à¸¡à¸µà¹€à¸­à¸à¸¥à¸±à¸à¸©à¸“à¹Œà¹„à¸¡à¹ˆà¸‹à¹‰à¸³à¹ƒà¸„à¸£",
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P004",
    name: "à¸™à¹‰à¸³à¸­à¸±à¸à¸Šà¸±à¸™à¸¡à¸°à¸™à¸²à¸§ à¸ªà¸”à¸Šà¸·à¹ˆà¸™ (à¸‚à¸§à¸” 250ml)",
    category: "à¸‡à¸²à¸™à¸„à¸«à¸à¸£à¸£à¸¡/à¹€à¸šà¹€à¸à¸­à¸£à¸µà¹ˆ",
    price: 15,
    stock: 40,
    description: "à¸™à¹‰à¸³à¸ªà¸¡à¸¸à¸™à¹„à¸žà¸£à¸•à¹‰à¸¡à¸ªà¸” à¸«à¸§à¸²à¸™à¸­à¸¡à¹€à¸›à¸£à¸µà¹‰à¸¢à¸§ à¸ªà¸”à¸Šà¸·à¹ˆà¸™ à¸”à¸±à¸šà¸à¸£à¸°à¸«à¸²à¸¢ à¸ˆà¸²à¸à¹à¸›à¸¥à¸‡à¸ªà¸¡à¸¸à¸™à¹„à¸žà¸£à¹‚à¸£à¸‡à¹€à¸£à¸µà¸¢à¸™",
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P005",
    name: "à¸—à¸µà¹ˆà¸£à¸­à¸‡à¹à¸à¹‰à¸§à¹„à¸¡à¹‰à¸ªà¸±à¸ à¸‰à¸¥à¸¸à¸¥à¸²à¸¢à¸›à¸£à¸°à¸”à¸´à¸©à¸à¹Œ",
    category: "à¸‡à¸²à¸™à¸Šà¹ˆà¸²à¸‡/à¸‡à¸²à¸™à¸›à¸£à¸°à¸”à¸´à¸©à¸à¹Œ",
    price: 45,
    stock: 20,
    description: "à¸œà¸¥à¸‡à¸²à¸™à¸ˆà¸²à¸à¸«à¹‰à¸­à¸‡à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸à¸²à¸£à¸‡à¸²à¸™à¸Šà¹ˆà¸²à¸‡ à¸‚à¸±à¸”à¹€à¸£à¸µà¸¢à¸š à¹€à¸„à¸¥à¸·à¸­à¸šà¹€à¸‡à¸²à¸à¸±à¸™à¸™à¹‰à¸³ à¸ªà¸§à¸¢à¸‡à¸²à¸¡à¸—à¸™à¸—à¸²à¸™",
    image_url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P006",
    name: "à¸Šà¸¸à¸”à¸­à¸¸à¸›à¸à¸£à¸“à¹Œà¸•à¸±à¸”à¹€à¸¢à¹‡à¸šà¹€à¸šà¸·à¹‰à¸­à¸‡à¸•à¹‰à¸™ (à¸žà¸à¸žà¸²)",
    category: "à¸­à¸¸à¸›à¸à¸£à¸“à¹Œà¸à¸²à¸£à¹€à¸£à¸µà¸¢à¸™à¸à¸²à¸£à¸‡à¸²à¸™",
    price: 55,
    stock: 30,
    description: "à¸›à¸£à¸°à¸à¸­à¸šà¸”à¹‰à¸§à¸¢ à¸à¸£à¸£à¹„à¸à¸£à¸•à¸±à¸”à¸”à¹‰à¸²à¸¢ à¹€à¸‚à¹‡à¸¡ à¸”à¹‰à¸²à¸¢à¸«à¸¥à¸²à¸à¸ªà¸µ à¸ªà¸²à¸¢à¸§à¸±à¸” à¹à¸¥à¸°à¸—à¸µà¹ˆà¹€à¸¥à¸²à¸° à¸ªà¸³à¸«à¸£à¸±à¸šà¸§à¸´à¸Šà¸²à¸à¸²à¸£à¸‡à¸²à¸™",
    image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=60"
  }
];

let memoryOrders = [];
let memoryPreorders = [];
let memoryMessages = [];

export default async function handler(req, res) {
  // à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸² CORS Header
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Supabase-Url, X-Supabase-Key"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // à¸­à¹ˆà¸²à¸™ Supabase à¸ˆà¸²à¸ Environment Variables à¸«à¸£à¸·à¸­ Client Headers
  const clientSbUrl = req.headers["x-supabase-url"] || (req.query && req.query.supabase_url);
  const clientSbKey = req.headers["x-supabase-key"] || (req.query && req.query.supabase_key);

  const SUPABASE_URL = clientSbUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = clientSbKey || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const action = req.query.action || (req.body && req.body.action);

  // Helper à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸£à¸µà¸¢à¸ Supabase REST API
  async function supabaseRequest(endpoint, options = {}) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return null;
    }
    const cleanUrl = SUPABASE_URL.replace(/\/$/, "");
    const url = `${cleanUrl}/rest/v1/${endpoint}`;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase error (${response.status}): ${errText}`);
    }
    return await response.json();
  }

  try {
    // -------------------------------------------------------------
    // GET Requests
    // -------------------------------------------------------------
    if (req.method === "GET") {
      if (action === "getProducts") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const data = await supabaseRequest("products?select=*&order=created_at.desc");
            if (Array.isArray(data) && data.length > 0) {
              return res.status(200).json({ success: true, data });
            }
          } catch (e) {
            console.warn("Supabase getProducts failed, using in-memory:", e.message);
          }
        }
        return res.status(200).json({ success: true, data: memoryProducts });
      }

      if (action === "getOrders") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const data = await supabaseRequest("orders?select=*&order=created_at.desc");
            if (Array.isArray(data)) {
              return res.status(200).json({ success: true, data });
            }
          } catch (e) {}
        }
        return res.status(200).json({ success: true, data: memoryOrders });
      }

      if (action === "getPreorders") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const data = await supabaseRequest("preorders?select=*&order=created_at.desc");
            if (Array.isArray(data)) {
              return res.status(200).json({ success: true, data });
            }
          } catch (e) {}
        }
        return res.status(200).json({ success: true, data: memoryPreorders });
      }

      if (action === "getMessages") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const data = await supabaseRequest("messages?select=*&order=created_at.desc");
            if (Array.isArray(data)) {
              return res.status(200).json({ success: true, data });
            }
          } catch (e) {}
        }
        return res.status(200).json({ success: true, data: memoryMessages });
      }

      if (action === "trackOrder") {
        const query = (req.query.query || "").trim();
        if (!query) {
          return res.status(200).json({ success: true, orders: [], preorders: [] });
        }
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const orders = await supabaseRequest(`orders?or=(order_id.ilike.%25${encodeURIComponent(query)}%25,student_name.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);
            const preorders = await supabaseRequest(`preorders?or=(preorder_id.ilike.%25${encodeURIComponent(query)}%25,student_name.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);
            return res.status(200).json({ success: true, orders: orders || [], preorders: preorders || [] });
          } catch (e) {}
        }

        const q = query.toLowerCase();
        const matchedOrders = memoryOrders.filter(o => 
          (o.order_id && o.order_id.toLowerCase().includes(q)) ||
          (o.student_name && o.student_name.toLowerCase().includes(q)) ||
          (o.phone && o.phone.includes(q))
        );
        const matchedPre = memoryPreorders.filter(p => 
          (p.preorder_id && p.preorder_id.toLowerCase().includes(q)) ||
          (p.student_name && p.student_name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q))
        );
        return res.status(200).json({ success: true, orders: matchedOrders, preorders: matchedPre });
      }

      return res.status(200).json({
        success: true,
        message: "SchoolShop Vercel API is running successfully!",
        supabase_connected: !!(SUPABASE_URL && SUPABASE_KEY)
      });
    }

    // -------------------------------------------------------------
    // POST Requests
    // -------------------------------------------------------------
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (_) {}
      }
      body = body || {};
      const postAction = body.action || action;

      // 1. à¸ªà¸£à¹‰à¸²à¸‡à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¹ƒà¸«à¸¡à¹ˆ
      if (postAction === "createOrder") {
        const orderId = "ORD-" + Date.now().toString().slice(-6);
        const orderRecord = {
          order_id: orderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­",
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: body.phone || "-",
          pickup_location: body.pickup_location || "-",
          items_json: typeof body.items === "string" ? body.items : JSON.stringify(body.items || []),
          total_price: Number(body.total_price) || 0,
          payment_method: body.payment_method || "à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡ (COD)",
          status: "à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£",
          note: body.note || ""
        };

        memoryOrders.unshift(orderRecord);

        // à¸•à¸±à¸”à¸ªà¸•à¹‡à¸­à¸à¹ƒà¸™ in-memory
        if (Array.isArray(body.items)) {
          for (const itm of body.items) {
            const prod = memoryProducts.find(p => String(p.id) === String(itm.id));
            if (prod) {
              prod.stock = Math.max(0, (Number(prod.stock) || 0) - (Number(itm.quantity) || 1));
            }
          }
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("orders", {
              method: "POST",
              body: JSON.stringify(orderRecord)
            });

            if (Array.isArray(body.items)) {
              for (const item of body.items) {
                const prods = await supabaseRequest(`products?id=eq.${item.id}`);
                if (prods && prods.length > 0) {
                  const currentStock = Number(prods[0].stock) || 0;
                  const newStock = Math.max(0, currentStock - (Number(item.quantity) || 1));
                  await supabaseRequest(`products?id=eq.${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ stock: newStock })
                  });
                }
              }
            }
          } catch (e) {
            console.warn("Supabase createOrder error:", e);
          }
        }

        return res.status(200).json({ success: true, order_id: orderId, data: orderRecord });
      }

      // 2. à¸›à¸£à¸±à¸šà¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­
      if (postAction === "updateOrderStatus") {
        const found = memoryOrders.find(o => o.order_id === body.order_id);
        if (found) found.status = body.status;

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`orders?order_id=eq.${body.order_id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: body.status })
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Order status updated" });
      }

      // 3. à¸ªà¸±à¹ˆà¸‡à¸ˆà¸­à¸‡à¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸²
      if (postAction === "createPreorder") {
        const preorderId = "PRE-" + Date.now().toString().slice(-6);
        const preRecord = {
          preorder_id: preorderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­",
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: body.phone || "-",
          notify_channel: body.notify_channel || "-",
          notify_account: body.notify_account || "-",
          product_name: body.product_name || "-",
          quantity: Number(body.quantity) || 1,
          delivery_date: body.delivery_date || "à¸£à¸­à¸„à¸¸à¸“à¸„à¸£à¸¹à¸à¸³à¸«à¸™à¸”à¸§à¸±à¸™",
          status: "à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£",
          note: body.note || ""
        };

        memoryPreorders.unshift(preRecord);

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("preorders", {
              method: "POST",
              body: JSON.stringify(preRecord)
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, preorder_id: preorderId, data: preRecord });
      }

      // 4. à¸à¸³à¸«à¸™à¸”à¸§à¸±à¸™à¸£à¸±à¸šà¸‚à¸­à¸‡à¸ˆà¸­à¸‡à¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸²
      if (postAction === "setPreorderDeliveryDate") {
        const found = memoryPreorders.find(p => p.preorder_id === body.preorder_id);
        if (found) {
          found.delivery_date = body.delivery_date;
          found.status = body.status || "à¸žà¸£à¹‰à¸­à¸¡à¸£à¸±à¸šà¸ªà¸´à¸™à¸„à¹‰à¸²à¹à¸¥à¹‰à¸§";
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`preorders?preorder_id=eq.${body.preorder_id}`, {
              method: "PATCH",
              body: JSON.stringify({ delivery_date: body.delivery_date, status: body.status || "à¸žà¸£à¹‰à¸­à¸¡à¸£à¸±à¸šà¸ªà¸´à¸™à¸„à¹‰à¸²à¹à¸¥à¹‰à¸§" })
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Delivery date set" });
      }

      // 5. à¸›à¸£à¸±à¸šà¸ªà¸–à¸²à¸™à¸°à¸à¸²à¸£à¸ˆà¸­à¸‡
      if (postAction === "updatePreorderStatus") {
        const found = memoryPreorders.find(p => p.preorder_id === body.preorder_id);
        if (found) found.status = body.status;

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`preorders?preorder_id=eq.${body.preorder_id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: body.status })
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Preorder status updated" });
      }

      // 6. à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸´à¸™à¸„à¹‰à¸² (Add Product)
      if (postAction === "addProduct") {
        const prodId = body.id || ("P" + ("000" + (memoryProducts.length + 1)).slice(-3));
        const newProduct = {
          id: prodId,
          name: body.name || "à¸ªà¸´à¸™à¸„à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆ",
          category: body.category || "à¸—à¸±à¹ˆà¸§à¹„à¸›",
          price: Number(body.price) || 0,
          stock: Number(body.stock) || 0,
          description: body.description || "",
          image_url: body.image_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
          is_active: body.is_active !== undefined ? Boolean(body.is_active) : true
        };

        const existingIdx = memoryProducts.findIndex(p => String(p.id) === String(prodId));
        if (existingIdx > -1) {
          memoryProducts[existingIdx] = { ...memoryProducts[existingIdx], ...newProduct };
        } else {
          memoryProducts.push(newProduct);
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("products", {
              method: "POST",
              body: JSON.stringify(newProduct)
            });
          } catch (e) {
            console.warn("Supabase addProduct error:", e);
          }
        }
        return res.status(200).json({ success: true, id: prodId, data: newProduct });
      }

      // 7. à¹à¸à¹‰à¹„à¸‚à¸ªà¸´à¸™à¸„à¹‰à¸² (Update Product)
      if (postAction === "updateProduct") {
        const prodId = body.id;
        const updateData = {
          name: body.name,
          category: body.category,
          price: Number(body.price) || 0,
          stock: Number(body.stock) || 0,
          description: body.description || "",
          image_url: body.image_url || ""
        };

        const idx = memoryProducts.findIndex(p => String(p.id) === String(prodId));
        if (idx > -1) {
          memoryProducts[idx] = { ...memoryProducts[idx], ...updateData };
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`products?id=eq.${body.id}`, {
              method: "PATCH",
              body: JSON.stringify(updateData)
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Product updated", data: memoryProducts[idx] });
      }

      // 8. à¸¥à¸šà¸ªà¸´à¸™à¸„à¹‰à¸² (Delete Product)
      if (postAction === "deleteProduct") {
        const prodId = body.id || req.query.id;
        memoryProducts = memoryProducts.filter(p => String(p.id) !== String(prodId));

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`products?id=eq.${prodId}`, {
              method: "DELETE"
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Product deleted", id: prodId });
      }

      // 9. à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸­à¸šà¸–à¸²à¸¡
      if (postAction === "sendMessage") {
        const msgId = "MSG-" + Date.now().toString().slice(-6);
        const msgRecord = {
          message_id: msgId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­",
          student_room: body.student_room || "-",
          message: body.message || "",
          reply: "",
          status: "à¸£à¸­à¸à¸²à¸£à¸•à¸­à¸šà¸à¸¥à¸±à¸š"
        };

        memoryMessages.unshift(msgRecord);

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("messages", {
              method: "POST",
              body: JSON.stringify(msgRecord)
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message_id: msgId, data: msgRecord });
      }

      // 10. à¸•à¸­à¸šà¸à¸¥à¸±à¸šà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡
      if (postAction === "replyMessage") {
        const found = memoryMessages.find(m => m.message_id === body.message_id);
        if (found) {
          found.reply = body.reply;
          found.status = "à¸•à¸­à¸šà¸à¸¥à¸±à¸šà¹à¸¥à¹‰à¸§";
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`messages?message_id=eq.${body.message_id}`, {
              method: "PATCH",
              body: JSON.stringify({ reply: body.reply, status: "à¸•à¸­à¸šà¸à¸¥à¸±à¸šà¹à¸¥à¹‰à¸§" })
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Message replied" });
      }

      return res.status(400).json({ success: false, message: "Unknown action: " + postAction });
    }

    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  } catch (error) {
    console.error("API Handler Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}