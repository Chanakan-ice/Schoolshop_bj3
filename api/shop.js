/**
 * Vercel Serverless Function: /api/shop
 * ทำหน้าที่เป็น REST API แทน Google Apps Script
 * รองรับ:
 * 1. Supabase REST API Cloud Database
 * 2. In-Memory Persistent Store (Zero-Config)
 * 3. ส่งอีเมลแจ้งเตือนคุณครู/แอดมินอัตโนมัติ (FormSubmit + Resend API)
 */

// In-Memory Persistent Store
let memoryProducts = [
  {
    id: "P001",
    name: "คุกกี้เนยสด ช็อกโกแลตชิพ (ฝีมือนักเรียน)",
    category: "งานคหกรรม/เบเกอรี่",
    price: 35,
    stock: 30,
    description: "คุกกี้หอมเนยแท้ กรอบอร่อย ผลงานนักเรียนแผนกคหกรรม อบสดใหม่ทุกวัน",
    image_url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P002",
    name: "ผักสลัดไฮโดรโปนิกส์ ปลอดสารเคมี",
    category: "งานเกษตร/ผลผลิต",
    price: 30,
    stock: 25,
    description: "ผักสลัดกรีนโอ๊ค-เรดโอ๊ค สด กรอบ สะอาด ปลูกโดยนักเรียนชมรมเกษตรอินทรีย์",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P003",
    name: "กระเป๋าผ้ารักษ์โลก ลายเพ้นท์แฮนด์เมด",
    category: "งานช่าง/งานประดิษฐ์",
    price: 79,
    stock: 15,
    description: "กระเป๋าผ้าแคนวาสอย่างดี เพ้นท์ลายศิลปะประดิษฐ์ใบต่อใบ มีเอกลักษณ์ไม่ซ้ำใคร",
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P004",
    name: "น้ำอัญชันมะนาว สดชื่น (ขวด 250ml)",
    category: "งานคหกรรม/เบเกอรี่",
    price: 15,
    stock: 40,
    description: "น้ำสมุนไพรต้มสด หวานอมเปรี้ยว สดชื่น ดับกระหาย จากแปลงสมุนไพรโรงเรียน",
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P005",
    name: "ที่รองแก้วไม้สัก ฉลุลายประดิษฐ์",
    category: "งานช่าง/งานประดิษฐ์",
    price: 45,
    stock: 20,
    description: "ผลงานจากห้องปฏิบัติการงานช่าง ขัดเรียบ เคลือบเงากันน้ำ สวยงามทนทาน",
    image_url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "P006",
    name: "ชุดอุปกรณ์ตัดเย็บเบื้องต้น (พกพา)",
    category: "อุปกรณ์การเรียนการงาน",
    price: 55,
    stock: 30,
    description: "ประกอบด้วย กรรไกรตัดด้าย เข็ม ด้ายหลากสี สายวัด และที่เลาะ สำหรับวิชาการงาน",
    image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=60"
  }
];

let memoryOrders = [];
let memoryPreorders = [];
let memoryMessages = [];

/**
 * ฟังก์ชันส่งอีเมลแจ้งเตือน (Email Notification Dispatcher)
 * รองรับทั้ง Resend API และ FormSubmit (Zero-config ไม่ต้องมี API Key)
 */
async function sendEmailNotification({ toEmails, subject, fields, htmlContent, resendKey }) {
  const apiKey = resendKey || process.env.RESEND_API_KEY;
  let emails = [];
  
  if (Array.isArray(toEmails)) {
    emails = toEmails;
  } else if (typeof toEmails === "string" && toEmails.trim()) {
    emails = toEmails.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes("@"));
  }
  
  if (emails.length === 0) {
    emails = ["schoolshop.bj3@gmail.com"];
  }

  let sentSuccessfully = false;

  // วิธีที่ 1: ส่งผ่าน Resend API หากมีคีย์
  if (apiKey) {
    try {
      const resendPayload = {
        from: "CareerShop <onboarding@resend.dev>",
        to: emails,
        subject: subject,
        html: htmlContent || Object.entries(fields).map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join("")
      };
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resendPayload)
      });
      if (res.ok) {
        sentSuccessfully = true;
        console.log("Email delivered via Resend API successfully");
      }
    } catch (err) {
      console.warn("Resend API delivery error:", err.message);
    }
  }

  // วิธีที่ 2: ส่งผ่าน FormSubmit.co ไปยังอีเมลผู้รับแต่ละคน
  if (!sentSuccessfully) {
    for (const email of emails) {
      try {
        const payload = {
          _subject: subject,
          ...fields
        };
        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Referer": "https://schoolshop.vercel.app/",
            "Origin": "https://schoolshop.vercel.app"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        console.log(`FormSubmit delivery to ${email}:`, result);
        sentSuccessfully = true;
      } catch (err) {
        console.warn(`FormSubmit delivery to ${email} error:`, err.message);
      }
    }
  }

  return sentSuccessfully;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Supabase-Url, X-Supabase-Key, X-Resend-Key"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const clientSbUrl = req.headers["x-supabase-url"] || (req.query && req.query.supabase_url);
  const clientSbKey = req.headers["x-supabase-key"] || (req.query && req.query.supabase_key);
  const clientResendKey = req.headers["x-resend-key"] || (req.query && req.query.resend_key);

  const SUPABASE_URL = clientSbUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = clientSbKey || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const RESEND_KEY = clientResendKey || process.env.RESEND_API_KEY;

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) {}
  }
  body = body || {};

  const action = req.query.action || body.action;

  // Supabase Request Helper
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
            console.warn("Supabase getProducts error, using in-memory:", e.message);
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

      // ทดสอบส่งอีเมล (GET)
      if (action === "testEmail") {
        const emails = req.query.emails || "schoolshop.bj3@gmail.com";
        await sendEmailNotification({
          toEmails: emails,
          subject: "🧪 [ทดสอบ] ระบบแจ้งเตือนอีเมลร้านค้า CareerShop บน Vercel",
          fields: {
            "หัวข้อ": "ทดสอบส่งอีเมลแจ้งเตือนร้านค้า",
            "ผู้รับ": emails,
            "เวลาที่ส่ง": new Date().toLocaleString("th-TH"),
            "ข้อความ": "ระบบแจ้งเตือนทางอีเมลของร้านค้าหมวดการงานอาชีพพร้อมใช้งานแล้ว เมื่อมีคำสั่งซื้อหรือสั่งจองใหม่ อีเมลจะถูกส่งมาที่นี่อัตโนมัติ"
          },
          resendKey: RESEND_KEY
        });
        return res.status(200).json({
          success: true,
          message: `ส่งอีเมลทดสอบไปยัง ${emails} เรียบร้อยแล้ว (หากเป็นครั้งแรก กรุณาตรวจสอบกล่องจดหมายหรือโฟลเดอร์สแปม เพื่อกด Activate Form)`
        });
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
      const postAction = body.action || action;

      // ทดสอบส่งอีเมล (POST)
      if (postAction === "testEmail") {
        const emails = body.emails || req.query.emails || "schoolshop.bj3@gmail.com";
        await sendEmailNotification({
          toEmails: emails,
          subject: "🧪 [ทดสอบ] ระบบแจ้งเตือนอีเมลร้านค้า CareerShop บน Vercel",
          fields: {
            "หัวข้อ": "ทดสอบส่งอีเมลแจ้งเตือนร้านค้า",
            "ผู้รับ": emails,
            "เวลาที่ส่ง": new Date().toLocaleString("th-TH"),
            "ข้อความ": "ระบบแจ้งเตือนทางอีเมลของร้านค้าหมวดการงานอาชีพพร้อมใช้งานแล้ว เมื่อมีคำสั่งซื้อหรือสั่งจองใหม่ อีเมลจะถูกส่งมาที่นี่อัตโนมัติ"
          },
          resendKey: RESEND_KEY || body.resend_key
        });
        return res.status(200).json({
          success: true,
          message: `ส่งอีเมลทดสอบไปยัง ${emails} เรียบร้อยแล้ว! (หากเป็นครั้งแรก กรุณาตรวจสอบอีเมลเพื่อกดปุ่มยืนยัน Activate Form)`
        });
      }

      // 1. สร้างคำสั่งซื้อใหม่ (Create Order)
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

        memoryOrders.unshift(orderRecord);

        // ตัดสต็อกใน in-memory
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

        // แปลงรายการสินค้าให้อ่านง่ายในอีเมล
        let itemsText = "-";
        if (Array.isArray(body.items)) {
          itemsText = body.items.map(i => `${i.name} (x${i.quantity}) - ${Number(i.price) * Number(i.quantity)} บาท`).join("\n");
        }

        // ส่งอีเมลแจ้งเตือนคุณครู / แอดมินทันที
        const targetEmails = body.admin_emails || "schoolshop.bj3@gmail.com";
        const isTeacherBuyer = body.department && body.department !== "-";
        const buyerRoleStr = isTeacherBuyer ? `คุณครู (${body.department})` : `นักเรียน (${body.student_class}/${body.student_room} เลขที่ ${body.student_no})`;

        try {
          await sendEmailNotification({
            toEmails: targetEmails,
            subject: `🛒 [คำสั่งซื้อใหม่ COD] รหัส ${orderId} - ยอดชำระ ${orderRecord.total_price} บาท`,
            fields: {
              "รหัสคำสั่งซื้อ": orderId,
              "วันที่สั่งซื้อ": orderRecord.timestamp,
              "ผู้สั่งซื้อ": `${orderRecord.student_name} (${buyerRoleStr})`,
              "เบอร์โทรติดต่อ": orderRecord.phone,
              "สถานที่นัดรับสินค้า": orderRecord.pickup_location,
              "รายการสินค้า": itemsText,
              "ยอดเงินที่ต้องชำระ (COD)": `${orderRecord.total_price} บาท`,
              "วิธีชำระเงิน": "ชำระเงินปลายทาง (COD) เมื่อรับของ",
              "หมายเหตุ": orderRecord.note || "-"
            },
            resendKey: RESEND_KEY || body.resend_key
          });
        } catch (mailErr) {
          console.warn("Email sending failed for order:", mailErr);
        }

        return res.status(200).json({ success: true, order_id: orderId, data: orderRecord });
      }

      // 2. ปรับสถานะคำสั่งซื้อ
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

      // 3. สั่งจองล่วงหน้า (Create Pre-order)
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

        memoryPreorders.unshift(preRecord);

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("preorders", {
              method: "POST",
              body: JSON.stringify(preRecord)
            });
          } catch (e) {}
        }

        // ส่งอีเมลแจ้งเตือนการจองสินค้า
        const targetEmails = body.admin_emails || "schoolshop.bj3@gmail.com";
        try {
          await sendEmailNotification({
            toEmails: targetEmails,
            subject: `🔔 [รายการสั่งจองใหม่] รหัส ${preorderId} - ${preRecord.product_name} (${preRecord.quantity} ชิ้น)`,
            fields: {
              "รหัสการจอง": preorderId,
              "วันที่บันทึก": preRecord.timestamp,
              "ผู้สั่งจอง": `${preRecord.student_name} (${preRecord.student_class}/${preRecord.student_room})`,
              "เบอร์โทรติดต่อ": preRecord.phone,
              "สินค้าที่จอง": `${preRecord.product_name} (จำนวน ${preRecord.quantity} ชิ้น)`,
              "วันที่ต้องการรับ": preRecord.delivery_date,
              "ช่องทางแจ้งเตือนผู้ซื้อ": `${preRecord.notify_channel}: ${preRecord.notify_account}`,
              "หมายเหตุ": preRecord.note || "-"
            },
            resendKey: RESEND_KEY || body.resend_key
          });
        } catch (mailErr) {
          console.warn("Email sending failed for preorder:", mailErr);
        }

        return res.status(200).json({ success: true, preorder_id: preorderId, data: preRecord });
      }

      // 4. กำหนดวันรับของจองล่วงหน้า
      if (postAction === "setPreorderDeliveryDate") {
        const found = memoryPreorders.find(p => p.preorder_id === body.preorder_id);
        if (found) {
          found.delivery_date = body.delivery_date;
          found.status = body.status || "พร้อมรับสินค้าแล้ว";
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`preorders?preorder_id=eq.${body.preorder_id}`, {
              method: "PATCH",
              body: JSON.stringify({ delivery_date: body.delivery_date, status: body.status || "พร้อมรับสินค้าแล้ว" })
            });
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: "Delivery date set" });
      }

      // 5. ปรับสถานะการจอง
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

      // 6. เพิ่มสินค้า (Add Product)
      if (postAction === "addProduct") {
        const prodId = body.id || ("P" + ("000" + (memoryProducts.length + 1)).slice(-3));
        const newProduct = {
          id: prodId,
          name: body.name || "สินค้าใหม่",
          category: body.category || "ทั่วไป",
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

      // 7. แก้ไขสินค้า (Update Product)
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

      // 8. ลบสินค้า (Delete Product)
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

      // 10. ตอบกลับข้อความ
      if (postAction === "replyMessage") {
        const found = memoryMessages.find(m => m.message_id === body.message_id);
        if (found) {
          found.reply = body.reply;
          found.status = "ตอบกลับแล้ว";
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest(`messages?message_id=eq.${body.message_id}`, {
              method: "PATCH",
              body: JSON.stringify({ reply: body.reply, status: "ตอบกลับแล้ว" })
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
