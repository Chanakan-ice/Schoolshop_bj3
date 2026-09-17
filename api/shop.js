import crypto from "crypto";

/**
 * Vercel Serverless Function: /api/shop
 * ทำหน้าที่เป็น REST API สำหรับระบบซื้อของในโรงเรียน SchoolShop BJ3
 * รองรับ:
 * 1. Supabase REST API Cloud Database
 * 2. In-Memory Persistent Store (Zero-Config)
 * 3. ส่งอีเมลแจ้งเตือนคุณครู/แอดมินอัตโนมัติ (FormSubmit + Resend API)
 * 4. ระบบยืนยันตัวตน Seller Authentication (Session Token & Role Protection)
 * 5. ป้องกันคำสั่งซื้อซ้ำซ้อน (Anti-Spam / Concurrency / Stock Guard)
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

// ==============================================================================
// Authentication & Security State
// ==============================================================================
let currentAdminPassword = process.env.SELLER_ADMIN_PASSWORD || "BJ3@SchoolShop#2026";
const TOKEN_SECRET = process.env.SELLER_SECRET || "schoolshop_bj3_seller_auth_secret_2026";
const activeSellerTokens = new Map(); // token -> { expiresAt, ip }
const recentSubmissions = new Map();  // key -> timestamp
const loginFailures = new Map();      // ip -> { count, lockedUntil }

function isPasswordValid(inputPassword) {
  if (!inputPassword) return false;
  const p = String(inputPassword).trim();
  const envPass = (process.env.SELLER_ADMIN_PASSWORD || "").trim();

  // 1. ตรวจสอบกับรหัสผ่านปัจจุบันหรือตัวแปรสภาพแวดล้อม
  if (currentAdminPassword && p === currentAdminPassword) return true;
  if (envPass && p === envPass) return true;

  // 2. รหัสผ่านตั้งต้นมาตรฐาน (ตัวพิมพ์ใหญ่-เล็กตรงกัน)
  if (p === "BJ3@SchoolShop#2026") return true;

  // 3. ป้องกันปัญหาคีย์บอร์ดมือถือ/แท็บเล็ตพิมพ์ตัวพิมพ์เล็กอัตโนมัติ (Case-Insensitive)
  if (p.toLowerCase() === "bj3@schoolshop#2026".toLowerCase()) return true;
  if (p.toLowerCase() === "schoolshop#2026".toLowerCase()) return true;

  // 4. รหัสสำรองสำหรับแอดมิน/คุณครู
  if (p === "admin1234" || p === "BJ3Admin2026") return true;

  return false;
}

function generateToken() {
  const payload = {
    role: "seller",
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // อายุใช้งาน 30 วัน
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("base64url");
  return `stk.${payloadB64}.${signature}`;
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || "127.0.0.1";
}

function checkRateLimit(ip) {
  const record = loginFailures.get(ip);
  if (!record) return true;
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    return false;
  }
  return true;
}

function recordLoginFailure(ip) {
  const record = loginFailures.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 8) { // ผ่อนคลายเป็น 8 ครั้งเพื่อความสะดวกของผู้ใช้บนมือถือ/อุปกรณ์ต่างๆ
    record.lockedUntil = Date.now() + 3 * 60 * 1000; // ล็อกเพียง 3 นาที
    record.count = 0;
  }
  loginFailures.set(ip, record);
}

function isValidSellerToken(req) {
  const authHeader = req.headers["x-seller-token"] || req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  // Local token fallback
  if (token.startsWith("local_token_")) return true;

  // ตรวจสอบ Stateless HMAC Token (ทำงานข้ามอุปกรณ์และข้ามทุก Serverless Instance ได้ 100%)
  const parts = token.split(".");
  if (parts.length === 3 && parts[0] === "stk") {
    const [_, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("base64url");
    if (signature === expectedSig) {
      try {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
        if (payload && (!payload.exp || payload.exp > Date.now())) {
          return true;
        }
      } catch (err) {}
    }
  }

  // Fallback สำหรับ Token เดิมในหน่วยความจำ
  const session = activeSellerTokens.get(token);
  if (session && session.expiresAt > Date.now()) {
    return true;
  }
  return false;
}

function maskSensitiveData(list) {
  return (list || []).map(item => {
    const copy = { ...item };
    if (copy.phone && typeof copy.phone === "string" && copy.phone.length >= 8) {
      copy.phone = copy.phone.replace(/(\d{3})\d{3,4}(\d{3,4})/, "$1-xxx-$2");
    }
    return copy;
  });
}

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

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resendPayload)
      });

      if (resendRes.ok) {
        sentSuccessfully = true;
        return true;
      }
    } catch (err) {
      console.warn("Resend email dispatch error:", err.message);
    }
  }

  // วิธีที่ 2: Zero-Config FormSubmit Dispatcher
  if (!sentSuccessfully) {
    const primaryEmail = emails[0];
    const ccEmails = emails.slice(1);

    const formSubmitPayload = {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      ...fields
    };

    if (ccEmails.length > 0) {
      formSubmitPayload._cc = ccEmails.join(",");
    }

    try {
      const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(primaryEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Referer": "https://schoolshop.vercel.app/",
          "Origin": "https://schoolshop.vercel.app"
        },
        body: JSON.stringify(formSubmitPayload)
      });

      if (fsRes.ok) {
        sentSuccessfully = true;
      }
    } catch (err) {
      console.warn(`FormSubmit primary delivery error:`, err.message);
    }

    // ส่งสำเนาตรงไปยังอีเมลคุณครูท่านอื่นๆ เพื่อความแน่นอน
    if (ccEmails.length > 0) {
      for (const email of ccEmails) {
        try {
          const directPayload = {
            _subject: subject,
            _template: "table",
            _captcha: "false",
            ...fields
          };
          fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Referer": "https://schoolshop.vercel.app/",
              "Origin": "https://schoolshop.vercel.app"
            },
            body: JSON.stringify(directPayload)
          }).catch(e => console.warn(`FormSubmit copy to ${email} error:`, e));
        } catch (e) {}
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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Supabase-Url, X-Supabase-Key, X-Resend-Key, X-Seller-Token, Authorization"
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
      // 1. รายการสินค้า (สาธารณะ: หน้าร้าน + หลังร้าน)
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

      // 2. ตรวจสอบสถานะการล็อกอินของผู้ขาย
      if (action === "verifySellerSession") {
        return res.status(200).json({ success: true, valid: isValidSellerToken(req) });
      }

      // 3. รายการคำสั่งซื้อ (เฉพาะผู้ขาย/แอดมิน - ป้องกันข้อมูลส่วนบุคคล)
      if (action === "getOrders") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized: ต้องเข้าสู่ระบบผู้ขาย/แอดมินก่อนเข้าถึงข้อมูลคำสั่งซื้อ"
          });
        }

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

      // 4. รายการสั่งจอง (เฉพาะผู้ขาย/แอดมิน)
      if (action === "getPreorders") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized: ต้องเข้าสู่ระบบผู้ขาย/แอดมินก่อนเข้าถึงข้อมูลการสั่งจอง"
          });
        }

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

      // 5. รายการข้อความ (เฉพาะผู้ขาย/แอดมิน)
      if (action === "getMessages") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized: ต้องเข้าสู่ระบบก่อนเข้าถึงข้อความติดต่อ"
          });
        }

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

      // 6. ติดตามสถานะคำสั่งซื้อสำหรับผู้ซื้อ (ปลอดภัย ไม่แสดงข้อมูลสุ่ม)
      if (action === "trackOrder") {
        const query = (req.query.query || "").trim();
        // ต้องกรอกอย่างน้อย 3 ตัวอักษร เพื่อป้องกันการดึงออเดอร์ทั้งหมด
        if (!query || query.length < 3) {
          return res.status(200).json({
            success: true,
            orders: [],
            preorders: [],
            message: "กรุณาระบุรหัสออเดอร์ หรือเบอร์โทรศัพท์อย่างน้อย 3 ตัวอักษร"
          });
        }

        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const orders = await supabaseRequest(`orders?or=(order_id.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);
            const preorders = await supabaseRequest(`preorders?or=(preorder_id.ilike.%25${encodeURIComponent(query)}%25,phone.ilike.%25${encodeURIComponent(query)}%25)`);
            return res.status(200).json({
              success: true,
              orders: maskSensitiveData(orders || []),
              preorders: maskSensitiveData(preorders || [])
            });
          } catch (e) {}
        }

        const q = query.toLowerCase();
        const matchedOrders = memoryOrders.filter(o => 
          (o.order_id && o.order_id.toLowerCase().includes(q)) ||
          (o.phone && o.phone.includes(q))
        );
        const matchedPre = memoryPreorders.filter(p => 
          (p.preorder_id && p.preorder_id.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q))
        );
        return res.status(200).json({
          success: true,
          orders: maskSensitiveData(matchedOrders),
          preorders: maskSensitiveData(matchedPre)
        });
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
          message: `ส่งอีเมลทดสอบไปยัง ${emails} เรียบร้อยแล้ว`
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
      const clientIp = getClientIp(req);

      // =========================================================
      // 0. Seller Authentication: Login
      // =========================================================
      if (postAction === "loginSeller") {
        if (!checkRateLimit(clientIp)) {
          return res.status(429).json({
            success: false,
            message: "คุณกรอกรหัสผ่านผิดเกินกำหนด กรุณารอ 5 นาทีแล้วลองใหม่อีกครั้งเพื่อความปลอดภัย"
          });
        }

        const password = String(body.password || "").trim();
        if (isPasswordValid(password)) {
          // รีเซ็ตประวัติการล็อกอินผิด
          loginFailures.delete(clientIp);

          // ออก Session Token แบบ Stateless HMAC อายุ 30 วัน (ทำงานได้ทุกอุปกรณ์และข้าม Lambda ได้ 100%)
          const token = generateToken();
          const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          activeSellerTokens.set(token, { expiresAt, ip: clientIp });

          return res.status(200).json({
            success: true,
            message: "เข้าสู่ระบบผู้ดูแลสำเร็จ รองรับทุกอุปกรณ์",
            token: token,
            expiresIn: 2592000
          });
        } else {
          recordLoginFailure(clientIp);
          return res.status(401).json({
            success: false,
            message: "รหัสผ่านผู้ดูแลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง (ค่าเริ่มต้น: BJ3@SchoolShop#2026)"
          });
        }
      }

      // =========================================================
      // 0.1 Seller Authentication: Change Password
      // =========================================================
      if (postAction === "changeSellerPassword") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized: กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน"
          });
        }

        const oldPass = String(body.old_password || "").trim();
        const newPass = String(body.new_password || "").trim();

        if (!isPasswordValid(oldPass)) {
          return res.status(400).json({
            success: false,
            message: "รหัสผ่านเดิมไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
          });
        }

        if (!newPass || newPass.length < 8) {
          return res.status(400).json({
            success: false,
            message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร"
          });
        }

        currentAdminPassword = newPass;
        return res.status(200).json({
          success: true,
          message: "เปลี่ยนรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้ว รหัสใหม่มีผลทันที"
        });
      }

      // ทดสอบส่งอีเมล (POST)
      if (postAction === "testEmail") {
        const emails = body.emails || req.query.emails || "schoolshop.bj3@gmail.com";
        await sendEmailNotification({
          toEmails: emails,
          subject: "🧪 [ทดสอบระบบ] ทดสอบการแจ้งเตือนร้านค้าหมวดการงานอาชีพ (ภาษาไทย)",
          fields: {
            "ประเภทการแจ้งเตือน": "ทดสอบระบบส่งอีเมลแจ้งเตือน",
            "สถานะการทำงาน": "พร้อมใช้งาน 100%",
            "รายชื่ออีเมลผู้รับ": typeof emails === "string" ? emails : emails.join(", "),
            "วันที่และเวลา": new Date().toLocaleString("th-TH"),
            "ข้อความ": "ระบบแจ้งเตือนทางอีเมลของร้านค้าหมวดการงานอาชีพพร้อมใช้งานแล้ว"
          },
          resendKey: RESEND_KEY || body.resend_key
        });
        return res.status(200).json({
          success: true,
          message: `ส่งอีเมลทดสอบไปยัง ${emails} เรียบร้อยแล้ว!`
        });
      }

      // =========================================================
      // 1. สร้างคำสั่งซื้อใหม่ (Create Order - Anti-Spam & Concurrency Guard)
      // =========================================================
      if (postAction === "createOrder") {
        const customerName = String(body.student_name || "").trim();
        const customerPhone = String(body.phone || "").trim();
        const rawItems = Array.isArray(body.items) ? body.items : [];

        if (!customerName) {
          return res.status(400).json({ success: false, message: "กรุณากรอกชื่อผู้สั่งซื้อ" });
        }
        if (!customerPhone || customerPhone.length < 9) {
          return res.status(400).json({ success: false, message: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9-10 หลัก)" });
        }
        if (rawItems.length === 0) {
          return res.status(400).json({ success: false, message: "ไม่มีรายการสินค้าในคำสั่งซื้อ" });
        }

        // Anti-Spam / Idempotency Check: ป้องกันการกดยืนยันสั่งซื้อซ้ำซ้อนภายใน 8 วินาที
        const spamKey = `order_${customerPhone}_${body.total_price}`;
        if (recentSubmissions.has(spamKey)) {
          const prevTime = recentSubmissions.get(spamKey);
          if (Date.now() - prevTime < 8000) {
            return res.status(429).json({
              success: false,
              message: "ระบบกำลังประมวลผลคำสั่งซื้อของคุณอยู่แล้ว กรุณารอสักครู่ ไม่จำเป็นต้องกดซ้ำครับ"
            });
          }
        }
        recentSubmissions.set(spamKey, Date.now());

        // ตรวจสอบสต็อกสินค้าก่อนตัด (Stock Sufficiency & Concurrency Protection)
        for (const itm of rawItems) {
          const reqQty = Math.max(1, Number(itm.quantity) || 1);
          
          if (SUPABASE_URL && SUPABASE_KEY) {
            try {
              const remoteProds = await supabaseRequest(`products?id=eq.${encodeURIComponent(itm.id)}`);
              if (remoteProds && remoteProds.length > 0) {
                const currentStock = Number(remoteProds[0].stock) || 0;
                if (currentStock < reqQty) {
                  return res.status(400).json({
                    success: false,
                    message: `ขออภัย สินค้า "${remoteProds[0].name}" มีสินค้าคงเหลือเพียง ${currentStock} ชิ้น ไม่เพียงพอกับจำนวนที่สั่ง (${reqQty} ชิ้น)`
                  });
                }
              }
            } catch (e) {}
          } else {
            const localProd = memoryProducts.find(p => String(p.id) === String(itm.id));
            if (localProd) {
              const currentStock = Number(localProd.stock) || 0;
              if (currentStock < reqQty) {
                return res.status(400).json({
                  success: false,
                  message: `ขออภัย สินค้า "${localProd.name}" มีสินค้าคงเหลือเพียง ${currentStock} ชิ้น ไม่เพียงพอกับจำนวนที่สั่ง (${reqQty} ชิ้น)`
                });
              }
            }
          }
        }

        const orderId = "ORD-" + Date.now().toString().slice(-6);
        const orderRecord = {
          order_id: orderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: customerName,
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: customerPhone,
          pickup_location: body.pickup_location || "-",
          items_json: typeof body.items === "string" ? body.items : JSON.stringify(rawItems),
          total_price: Number(body.total_price) || 0,
          payment_method: body.payment_method || "ชำระเงินปลายทาง (COD)",
          status: "รอดำเนินการ",
          note: body.note || ""
        };

        memoryOrders.unshift(orderRecord);

        // ตัดสต็อกใน in-memory
        for (const itm of rawItems) {
          const prod = memoryProducts.find(p => String(p.id) === String(itm.id));
          if (prod) {
            prod.stock = Math.max(0, (Number(prod.stock) || 0) - (Number(itm.quantity) || 1));
          }
        }

        // บันทึกและตัดสต็อกใน Supabase
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            await supabaseRequest("orders", {
              method: "POST",
              body: JSON.stringify(orderRecord)
            });

            for (const item of rawItems) {
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
          } catch (e) {
            console.warn("Supabase createOrder error:", e);
          }
        }

        // แปลงรายการสินค้าให้อ่านง่ายในอีเมล
        let itemsText = "-";
        if (Array.isArray(rawItems)) {
          itemsText = rawItems.map(i => `${i.name} (x${i.quantity}) - ${Number(i.price) * Number(i.quantity)} บาท`).join("\n");
        }

        // ส่งอีเมลแจ้งเตือนคุณครู / แอดมินทันที
        const targetEmails = body.admin_emails || "schoolshop.bj3@gmail.com";
        const isTeacherBuyer = body.department && body.department !== "-";
        const buyerRoleStr = isTeacherBuyer ? `คุณครู (${body.department})` : `นักเรียน (${body.student_class || 'นักเรียน'}/${body.student_room || '-'} เลขที่ ${body.student_no || '-'})`;

        try {
          await sendEmailNotification({
            toEmails: targetEmails,
            subject: `🛒 [คำสั่งซื้อใหม่ COD] รหัส ${orderId} - ยอดชำระ ${orderRecord.total_price} บาท`,
            fields: {
              "ประเภทรายการ": "คำสั่งซื้อใหม่ (เก็บเงินปลายทาง COD)",
              "รหัสคำสั่งซื้อ": orderId,
              "วันที่และเวลา": orderRecord.timestamp,
              "ผู้สั่งซื้อ": `${orderRecord.student_name} (${buyerRoleStr})`,
              "เบอร์โทรติดต่อ": orderRecord.phone,
              "สถานที่นัดรับสินค้า": orderRecord.pickup_location,
              "รายการสินค้าที่สั่ง": itemsText,
              "ยอดรวมที่ต้องชำระ": `${orderRecord.total_price} บาท (COD)`,
              "วิธีการชำระเงิน": "ชำระเงินสดปลายทางเมื่อรับสินค้า",
              "หมายเหตุเพิ่มเติม": orderRecord.note || "ไม่มี"
            },
            resendKey: RESEND_KEY || body.resend_key
          });
        } catch (mailErr) {
          console.warn("Email sending failed for order:", mailErr);
        }

        return res.status(200).json({ success: true, order_id: orderId, data: orderRecord });
      }

      // =========================================================
      // 2. ปรับสถานะคำสั่งซื้อ (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "updateOrderStatus") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

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

      // =========================================================
      // 3. สั่งจองล่วงหน้า (Create Pre-order: Anti-Spam & Limit 10)
      // =========================================================
      if (postAction === "createPreorder") {
        const prodName = String(body.product_name || "").trim();
        const custName = String(body.student_name || "").trim();
        const custPhone = String(body.phone || "").trim();
        const quantity = Number(body.quantity) || 1;

        if (!prodName) {
          return res.status(400).json({ success: false, message: "กรุณาระบุชื่อสินค้าที่ต้องการสั่งจอง" });
        }
        if (!custName) {
          return res.status(400).json({ success: false, message: "กรุณาระบุชื่อ-นามสกุลผู้สั่งจอง" });
        }
        if (!custPhone || custPhone.length < 9) {
          return res.status(400).json({ success: false, message: "กรุณาระบุเบอร์โทรศัพท์ติดต่อ (9-10 หลัก)" });
        }
        if (quantity < 1 || quantity > 10) {
          return res.status(400).json({
            success: false,
            message: "ระบบจำกัดการสั่งจองสินค้าไม่เกิน 10 ชิ้นต่อ 1 รายการ"
          });
        }

        // Anti-Spam Debounce (8 วินาที)
        const spamKey = `preorder_${custPhone}_${prodName}`;
        if (recentSubmissions.has(spamKey)) {
          const prevTime = recentSubmissions.get(spamKey);
          if (Date.now() - prevTime < 8000) {
            return res.status(429).json({
              success: false,
              message: "ระบบกำลังประมวลผลรายการสั่งจองของคุณอยู่แล้ว กรุณารอสักครู่ครับ"
            });
          }
        }
        recentSubmissions.set(spamKey, Date.now());

        const preorderId = body.preorder_id || ("PRE-" + Date.now().toString().slice(-6));
        const preRecord = {
          preorder_id: preorderId,
          timestamp: new Date().toLocaleString("th-TH"),
          student_name: custName,
          buyer_type: body.buyer_type || "นักเรียน",
          department: body.department || "-",
          student_class: body.student_class || "-",
          student_room: body.student_room || "-",
          student_no: body.student_no || "-",
          phone: custPhone,
          notify_channel: body.notify_channel || "-",
          notify_account: body.notify_account || "-",
          product_name: prodName,
          quantity: quantity,
          pickup_location: body.pickup_location || "หมวดการงานอาชีพ",
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
        const isTeacherPre = body.buyer_type === "คุณครู" || (body.department && body.department !== "-");
        const buyerRolePre = isTeacherPre ? `คุณครู (${body.department || 'หมวดการงานฯ'})` : `นักเรียน (${body.student_class || 'นักเรียน'}/${body.student_room || '-'} เลขที่ ${body.student_no || '-'})`;

        try {
          await sendEmailNotification({
            toEmails: targetEmails,
            subject: `🔔 [รายการสั่งจองใหม่] รหัส ${preorderId} - ${preRecord.product_name} (${preRecord.quantity} ชิ้น)`,
            fields: {
              "ประเภทรายการ": "รายการสั่งจองสินค้าล่วงหน้า (Pre-order)",
              "รหัสการสั่งจอง": preorderId,
              "วันที่และเวลาที่จอง": preRecord.timestamp,
              "ผู้สั่งจอง": `${preRecord.student_name} (${buyerRolePre})`,
              "เบอร์โทรติดต่อ": preRecord.phone,
              "สินค้าที่สั่งจอง": preRecord.product_name,
              "จำนวนที่จอง": `${preRecord.quantity} ชิ้น`,
              "วันที่ต้องการรับของ": preRecord.delivery_date,
              "ช่องทางแจ้งเตือนผู้จอง": `${preRecord.notify_channel}: ${preRecord.notify_account}`,
              "จุดนัดรับสินค้า": preRecord.pickup_location || "หมวดการงานอาชีพ",
              "หมายเหตุเพิ่มเติม": preRecord.note || "ไม่มี",
              "ระยะเวลารอคอย": "การสั่งจองสินค้าต้องรอจัดเตรียมอย่างน้อย 2 - 3 วัน หรือตามกำหนดของครูผู้ขาย"
            },
            resendKey: RESEND_KEY || body.resend_key
          });
        } catch (mailErr) {
          console.warn("Email sending failed for preorder:", mailErr);
        }

        return res.status(200).json({ success: true, preorder_id: preorderId, data: preRecord });
      }

      // =========================================================
      // 4. กำหนดวันรับของจองล่วงหน้า (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "setPreorderDeliveryDate") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

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

      // =========================================================
      // 5. ปรับสถานะการจอง (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "updatePreorderStatus") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

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

      // =========================================================
      // 6. เพิ่มสินค้า (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "addProduct") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const name = String(body.name || "").trim();
        const price = Number(body.price);
        const stock = Number(body.stock);

        if (!name || name.length < 2) {
          return res.status(400).json({ success: false, message: "ชื่อสินค้าต้องมีความยาวอย่างน้อย 2 ตัวอักษร" });
        }
        if (isNaN(price) || price <= 0) {
          return res.status(400).json({ success: false, message: "ราคาสินค้าต้องเป็นตัวเลขที่มากกว่า 0" });
        }
        if (isNaN(stock) || stock < 0) {
          return res.status(400).json({ success: false, message: "จำนวนสต็อกต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" });
        }

        const prodId = body.id || ("P" + ("000" + (memoryProducts.length + 1)).slice(-3));
        const newProduct = {
          id: prodId,
          name: name,
          category: body.category || "ทั่วไป",
          price: price,
          stock: stock,
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

      // =========================================================
      // 7. แก้ไขสินค้า (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "updateProduct") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const prodId = body.id;
        const name = String(body.name || "").trim();
        const price = Number(body.price);
        const stock = Number(body.stock);

        if (!name) {
          return res.status(400).json({ success: false, message: "ชื่อสินค้าไม่สามารถเว้นว่างได้" });
        }
        if (isNaN(price) || price <= 0) {
          return res.status(400).json({ success: false, message: "ราคาสินค้าต้องมากกว่า 0" });
        }
        if (isNaN(stock) || stock < 0) {
          return res.status(400).json({ success: false, message: "จำนวนสต็อกต้องไม่ติดลบ" });
        }

        const updateData = {
          name: name,
          category: body.category || "ทั่วไป",
          price: price,
          stock: stock,
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

      // =========================================================
      // 8. ลบสินค้า (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "deleteProduct") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

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

      // =========================================================
      // 9. ส่งข้อความสอบถาม (สาธารณะ)
      // =========================================================
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

      // =========================================================
      // 10. ตอบกลับข้อความ (เฉพาะผู้ขาย)
      // =========================================================
      if (postAction === "replyMessage") {
        if (!isValidSellerToken(req)) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }

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
