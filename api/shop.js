/**
 * Vercel Serverless Function: /api/shop
 * ทำหน้าที่เป็น REST API แทน Google Apps Script
 * รองรับการเชื่อมต่อกับ Supabase REST API และมีโหมด Fallback
 */

export default async function handler(req, res) {
  // ตั้งค่า CORS Header ให้รองรับการเรียกจากหน้าเว็บ
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const action = req.query.action || (req.body && req.body.action);

  // Helper สำหรับเรียก Supabase REST API
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
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return res.status(200).json({ success: true, is_local: true, data: [] });
        }
        const data = await supabaseRequest("products?select=*&order=created_at.desc");
        return res.status(200).json({ success: true, data: data || [] });
      }

      if (action === "getOrders") {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return res.status(200).json({ success: true, is_local: true, data: [] });
        }
        const data = await supabaseRequest("orders?select=*&order=created_at.desc");
        return res.status(200).json({ success: true, data: data || [] });
      }

      if (action === "getPreorders") {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return res.status(200).json({ success: true, is_local: true, data: [] });
        }
        const data = await supabaseRequest("preorders?select=*&order=created_at.desc");
        return res.status(200).json({ success: true, data: data || [] });
      }

      if (action === "getMessages") {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return res.status(200).json({ success: true, is_local: true, data: [] });
        }
        const data = await supabaseRequest("messages?select=*&order=created_at.desc");
        return res.status(200).json({ success: true, data: data || [] });
      }

      if (action === "trackOrder") {
        const query = (req.query.query || "").trim();
        if (!query) {
          return res.status(200).json({ success: true, orders: [], preorders: [] });
        }
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          return res.status(200).json({ success: true, is_local: true, orders: [], preorders: [] });
        }

        const orders = await supabaseRequest(`orders?or=(order_id.ilike.%25${encodeURIComponent(query)}%25,student_name.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);
        const preorders = await supabaseRequest(`preorders?or=(preorder_id.ilike.%25${encodeURIComponent(query)}%25,student_name.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);

        return res.status(200).json({ success: true, orders: orders || [], preorders: preorders || [] });
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
      const postAction = body.action || action;

      // 1. สร้างคำสั่งซื้อใหม่
      if (postAction === "createOrder") {
        const orderId = "ORD-" + Date.now().toString().slice(-6);
        const orderRecord = {
          order_id: orderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "ไม่ระบุชื่อ",
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: body.phone || "-",
          pickup_location: body.pickup_location || "-",
          items_json: typeof body.items === "string" ? body.items : JSON.stringify(body.items || []),
          total_price: Number(body.total_price) || 0,
          payment_method: body.payment_method || "ชำระเงินปลายทาง (COD)",
          status: "รอดำเนินการ",
          note: body.note || ""
        };

        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest("orders", {
            method: "POST",
            body: JSON.stringify(orderRecord)
          });

          // ตัดสต็อกสินค้า
          if (Array.isArray(body.items)) {
            for (const item of body.items) {
              try {
                const prods = await supabaseRequest(`products?id=eq.${item.id}`);
                if (prods && prods.length > 0) {
                  const currentStock = Number(prods[0].stock) || 0;
                  const newStock = Math.max(0, currentStock - (Number(item.quantity) || 1));
                  await supabaseRequest(`products?id=eq.${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ stock: newStock })
                  });
                }
              } catch (stockErr) {
                console.warn("Update stock error:", stockErr);
              }
            }
          }
        }

        return res.status(200).json({ success: true, order_id: orderId, data: orderRecord });
      }

      // 2. ปรับสถานะคำสั่งซื้อ
      if (postAction === "updateOrderStatus") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`orders?order_id=eq.${body.order_id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: body.status })
          });
        }
        return res.status(200).json({ success: true, message: "Order status updated" });
      }

      // 3. สั่งจองล่วงหน้า
      if (postAction === "createPreorder") {
        const preorderId = "PRE-" + Date.now().toString().slice(-6);
        const preRecord = {
          preorder_id: preorderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "ไม่ระบุชื่อ",
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: body.phone || "-",
          notify_channel: body.notify_channel || "-",
          notify_account: body.notify_account || "-",
          product_name: body.product_name || "-",
          quantity: Number(body.quantity) || 1,
          delivery_date: body.delivery_date || "รอคุณครูกำหนดวัน",
          status: "รอดำเนินการ",
          note: body.note || ""
        };

        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest("preorders", {
            method: "POST",
            body: JSON.stringify(preRecord)
          });
        }
        return res.status(200).json({ success: true, preorder_id: preorderId, data: preRecord });
      }

      // 4. กำหนดวันรับของจองล่วงหน้า
      if (postAction === "setPreorderDeliveryDate") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`preorders?preorder_id=eq.${body.preorder_id}`, {
            method: "PATCH",
            body: JSON.stringify({ delivery_date: body.delivery_date, status: body.status || "พร้อมรับสินค้าแล้ว" })
          });
        }
        return res.status(200).json({ success: true, message: "Delivery date set" });
      }

      // 5. ปรับสถานะการจอง
      if (postAction === "updatePreorderStatus") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`preorders?preorder_id=eq.${body.preorder_id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: body.status })
          });
        }
        return res.status(200).json({ success: true, message: "Preorder status updated" });
      }

      // 6. เพิ่มสินค้า
      if (postAction === "addProduct") {
        const prodId = body.id || ("P" + Date.now().toString().slice(-5));
        const newProduct = {
          id: prodId,
          name: body.name,
          category: body.category,
          price: Number(body.price) || 0,
          stock: Number(body.stock) || 0,
          description: body.description || "",
          image_url: body.image_url || "",
          is_active: body.is_active !== undefined ? Boolean(body.is_active) : true
        };

        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest("products", {
            method: "POST",
            body: JSON.stringify(newProduct)
          });
        }
        return res.status(200).json({ success: true, id: prodId, data: newProduct });
      }

      // 7. แก้ไขสินค้า
      if (postAction === "updateProduct") {
        const updateData = {
          name: body.name,
          category: body.category,
          price: Number(body.price) || 0,
          stock: Number(body.stock) || 0,
          description: body.description || "",
          image_url: body.image_url || "",
          is_active: body.is_active !== undefined ? Boolean(body.is_active) : true
        };

        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`products?id=eq.${body.id}`, {
            method: "PATCH",
            body: JSON.stringify(updateData)
          });
        }
        return res.status(200).json({ success: true, message: "Product updated" });
      }

      // 8. ลบสินค้า
      if (postAction === "deleteProduct") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`products?id=eq.${body.id}`, {
            method: "DELETE"
          });
        }
        return res.status(200).json({ success: true, message: "Product deleted" });
      }

      // 9. ส่งข้อความสอบถาม
      if (postAction === "sendMessage") {
        const msgId = "MSG-" + Date.now().toString().slice(-6);
        const msgRecord = {
          message_id: msgId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: body.student_name || "ไม่ระบุชื่อ",
          student_room: body.student_room || "-",
          message: body.message || "",
          reply: "",
          status: "รอการตอบกลับ"
        };

        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest("messages", {
            method: "POST",
            body: JSON.stringify(msgRecord)
          });
        }
        return res.status(200).json({ success: true, message_id: msgId, data: msgRecord });
      }

      // 10. ตอบกลับข้อความ
      if (postAction === "replyMessage") {
        if (SUPABASE_URL && SUPABASE_KEY) {
          await supabaseRequest(`messages?message_id=eq.${body.message_id}`, {
            method: "PATCH",
            body: JSON.stringify({ reply: body.reply, status: "ตอบกลับแล้ว" })
          });
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
