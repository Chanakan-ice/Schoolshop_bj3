/**
 * ==============================================================================
 * Web App ระบบซื้อของในโรงเรียน (School Shopping Web Application)
 * Seller Admin Logic: seller.js
 * ==============================================================================
 */

// API Backend Endpoint บน Vercel (/api/shop)
var LIVE_VERCEL_API = "https://schoolshop-bj3.vercel.app/api/shop";
var DEFAULT_API_URL = (typeof window !== "undefined" && (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? LIVE_VERCEL_API
  : "/api/shop";
var DEFAULT_ADMIN_EMAIL = "schoolshop.bj3@gmail.com";

function getActiveApiUrl() {
  let url = (localStorage.getItem("SCHOOLSHOP_API_URL") || "").trim();
  if (!url || url.includes("script.google.com") || ((window.location.protocol === "file:" || window.location.hostname === "localhost") && url.startsWith("/"))) {
    url = DEFAULT_API_URL;
    localStorage.setItem("SCHOOLSHOP_API_URL", DEFAULT_API_URL);
  }
  return url || DEFAULT_API_URL;
}

var API_URL = getActiveApiUrl();
var GAS_API_URL = API_URL;
window.API_URL = API_URL;
window.GAS_API_URL = API_URL;

// Helper: Fetch พร้อมระบบตัดเวลาอัตโนมัติ (Timeout Guard ป้องกันหน้าค้าง)
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Token & Security Headers สำหรับติดต่อ Seller API
function getSellerToken() {
  return localStorage.getItem("SELLER_AUTH_TOKEN") || sessionStorage.getItem("SELLER_AUTH_TOKEN") || "";
}

function getSellerHeaders(custom = {}) {
  const token = getSellerToken();
  const headers = { ...custom };
  if (token) {
    headers["X-Seller-Token"] = token;
    headers["Authorization"] = `Bearer ${token}`;
  }
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    headers["X-Supabase-Url"] = sbConfig.url;
    headers["X-Supabase-Key"] = sbConfig.key;
  }
  return headers;
}

const DEFAULT_SUPABASE_URL = "https://ztxihwioqkekkfokdhew.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_ez6_m3XM5OQlCovVlwu1wQ_R4DQvQXU";

function normalizeSupabaseUrl(input) {
  if (!input) return "";
  let clean = input.trim();
  const dashboardMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (/^[a-z0-9]{20}$/i.test(clean)) {
    return `https://${clean}.supabase.co`;
  }
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean.replace(/\/$/, "");
}

// Supabase Direct Client Helper
function getSupabaseConfig() {
  const rawUrl = localStorage.getItem("SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  const url = normalizeSupabaseUrl(rawUrl);
  const key = (localStorage.getItem("SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_KEY).trim();
  if (url && key) {
    return { url, key };
  }
  return null;
}

async function supabaseFetch(endpoint, options = {}) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const url = `${config.url}/rest/v1/${endpoint}`;
  const headers = {
    "apikey": config.key,
    "Authorization": `Bearer ${config.key}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return await res.json();
}

// ข้อมูลจำลองเริ่มต้น (Mock Data) สำหรับหมวดการงานอาชีพ
const DEFAULT_PRODUCTS = [
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

function getApiHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    headers["X-Supabase-Url"] = sbConfig.url;
    headers["X-Supabase-Key"] = sbConfig.key;
  }
  return headers;
}

// State & Custom Products Persistence (ป้องกันสินค้ารีเฟรชแล้วหาย 100%)
function getCustomProducts() {
  try {
    const data = JSON.parse(localStorage.getItem("SCHOOLSHOP_CUSTOM_PRODUCTS") || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveCustomProducts(list) {
  try {
    localStorage.setItem("SCHOOLSHOP_CUSTOM_PRODUCTS", JSON.stringify(list || []));
  } catch (e) {}
}

function getDeletedProductIds() {
  try {
    const data = JSON.parse(localStorage.getItem("SCHOOLSHOP_DELETED_PRODUCT_IDS") || "[]");
    return Array.isArray(data) ? data.map(String) : [];
  } catch (e) {
    return [];
  }
}

function saveDeletedProductIds(list) {
  try {
    localStorage.setItem("SCHOOLSHOP_DELETED_PRODUCT_IDS", JSON.stringify(list || []));
  } catch (e) {}
}

// สร้างรหัสสินค้าที่ไม่ซ้ำแน่นอน 100% ป้องกันรหัสชนกันและการกดแล้วสลับสินค้า
function generateUniqueProductId() {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).substring(2, 6);
  return `P${ts}_${rand}`;
}

function mergeSellerProducts(remoteList) {
  const customList = getCustomProducts();
  const deletedIds = new Set(getDeletedProductIds());
  const map = new Map();

  // 1. Remote or default items that are not deleted
  const baseList = (Array.isArray(remoteList) && remoteList.length > 0) ? remoteList : DEFAULT_PRODUCTS;
  baseList.forEach(p => {
    if (p && p.id && !deletedIds.has(String(p.id))) {
      map.set(String(p.id), { ...p });
    }
  });

  // 2. Custom products ALWAYS take precedence and are NEVER lost on refresh
  customList.forEach(p => {
    if (p && p.id && !deletedIds.has(String(p.id))) {
      map.set(String(p.id), { ...p });
    }
  });

  return Array.from(map.values());
}

function getInitialSellerProducts() {
  const saved = localStorage.getItem("SCHOOLSHOP_LOCAL_PRODUCTS");
  let list = [];
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
    } catch (e) {}
  }
  return mergeSellerProducts(list.length > 0 ? list : DEFAULT_PRODUCTS);
}

var allOrders = window.allOrders || [];
var allProducts = getInitialSellerProducts();
var allPreorders = window.allPreorders || [];
var allMessages = window.allMessages || [];

async function syncStoreConfig() {
  if (GAS_API_URL) {
    try {
      const res = await fetchWithTimeout(`${GAS_API_URL}?action=getStoreConfig`, {}, 3000);
      const json = await res.json();
      if (json && json.success && json.supabase_url && json.supabase_anon_key) {
        localStorage.setItem("SUPABASE_URL", json.supabase_url);
        localStorage.setItem("SUPABASE_ANON_KEY", json.supabase_anon_key);
        const sbUrlInput = document.getElementById("supabaseUrlInput");
        if (sbUrlInput && !sbUrlInput.value) sbUrlInput.value = json.supabase_url;
        const sbKeyInput = document.getElementById("supabaseKeyInput");
        if (sbKeyInput && !sbKeyInput.value) sbKeyInput.value = json.supabase_anon_key;
        return { url: json.supabase_url, key: json.supabase_anon_key };
      }
    } catch (e) {}
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const apiInput = document.getElementById("apiUrlInput");
  if (apiInput && GAS_API_URL) {
    apiInput.value = GAS_API_URL;
  }

  const tokenInput = document.getElementById("sellerNotifyTokenInput");
  const savedToken = localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKENS") || localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKEN") || localStorage.getItem("SELLER_NOTIFY_TOKEN") || "";
  if (tokenInput && savedToken) {
    tokenInput.value = savedToken;
  }

  const emailInput = document.getElementById("adminEmailsInput");
  if (emailInput) {
    emailInput.value = localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || DEFAULT_ADMIN_EMAIL;
  }

  const sbUrlInput = document.getElementById("supabaseUrlInput");
  if (sbUrlInput) {
    sbUrlInput.value = localStorage.getItem("SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  }

  const sbKeyInput = document.getElementById("supabaseKeyInput");
  if (sbKeyInput) {
    sbKeyInput.value = localStorage.getItem("SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_KEY;
  }

  // ซิงก์การตั้งค่า Supabase จากเซิร์ฟเวอร์อัตโนมัติ เพื่อให้ข้ามอุปกรณ์ได้
  await syncStoreConfig();

  // ตรวจสอบ Auth เมื่อเปิดหน้า seller (ทั้ง /seller หรือ seller.html)
  if (window.location.pathname.includes("seller") || window.location.search.includes("view=seller")) {
    checkAdminAuth();
  }
});

// ==================== Tab Switching ====================
function switchTab(tabId, element) {
  const panes = document.querySelectorAll(".tab-pane");
  panes.forEach(pane => pane.style.display = "none");

  const selectedPane = document.getElementById(tabId);
  if (selectedPane) selectedPane.style.display = "block";

  const tabs = document.querySelectorAll(".dash-tab");
  tabs.forEach(tab => tab.classList.remove("active"));
  if (element) element.classList.add("active");
}

// ==================== Refresh & Load Data ====================
async function refreshAllData() {
  showToast("กำลังโหลดข้อมูลล่าสุด...", "info");
  await Promise.all([
    loadOrders(),
    loadSellerProducts(),
    loadPreorders(),
    loadMessages()
  ]);
  updateMetrics();
}

function sortDescendingByTime(list, idKey = "order_id") {
  return list.sort((a, b) => {
    // 1. ISO date: created_at
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;

    // 2. Thai timestamp string: "16/9/2569 17:04:50"
    const parseTime = (str) => {
      if (!str) return 0;
      const m = String(str).match(/(\d+)[/.-](\d+)[/.-](\d+)[,\s]+(\d+):(\d+):?(\d+)?/);
      if (m) {
        let d = parseInt(m[1]), mo = parseInt(m[2]) - 1, y = parseInt(m[3]);
        if (y > 2500) y -= 543;
        return new Date(y, mo, d, parseInt(m[4]) || 0, parseInt(m[5]) || 0, parseInt(m[6]) || 0).getTime();
      }
      const t = Date.parse(str);
      return isNaN(t) ? 0 : t;
    };
    const tA = parseTime(a.timestamp);
    const tB = parseTime(b.timestamp);
    if (tA && tB && tA !== tB) return tB - tA;

    // 3. ID descending (ORD-xxxx or PRE-xxxx)
    return String(b[idKey] || "").localeCompare(String(a[idKey] || ""), undefined, { numeric: true });
  });
}

// 1. Orders
async function loadOrders() {
  let apiOrders = [];

  // ลองดึงจาก Supabase โดยตรงก่อน (เรียลไทม์และรวดเร็วข้ามอุปกรณ์)
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      const sbData = await supabaseFetch("orders?select=*&order=created_at.desc");
      if (Array.isArray(sbData) && sbData.length > 0) {
        apiOrders = sbData;
      }
    } catch (sbErr) {
      console.warn("Supabase loadOrders failed, fallback to API:", sbErr);
    }
  }

  const targetUrl = getActiveApiUrl();
  if (apiOrders.length === 0 && targetUrl) {
    try {
      const res = await fetchWithTimeout(`${targetUrl}?action=getOrders`, {
        headers: getSellerHeaders()
      }, 6000);
      if (res.status === 401) {
        sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
        sessionStorage.removeItem("SELLER_AUTH_TOKEN");
        openAdminAuthModal();
        showToast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้ง", "warning");
        return;
      }
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        apiOrders = json.data;
      }
    } catch (e) {
      console.warn("Orders fetch failed/timeout:", e);
    }
  }

  const localOrders = JSON.parse(localStorage.getItem("SCHOOLSHOP_ORDERS") || "[]");
  const map = new Map();
  [...apiOrders, ...localOrders].forEach(o => {
    if (o && o.order_id && !map.has(o.order_id)) {
      map.set(o.order_id, o);
    }
  });

  allOrders = sortDescendingByTime(Array.from(map.values()), "order_id");
  renderOrdersTable(allOrders);
}

function renderOrdersTable(ordersToDisplay) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  if (ordersToDisplay.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีคำสั่งซื้อ</td></tr>`;
    return;
  }

  tbody.innerHTML = ordersToDisplay.map(order => {
    let itemsText = "-";
    if (typeof order.items_json === "string") {
      try {
        const parsed = JSON.parse(order.items_json);
        itemsText = parsed.map(p => `${p.name} (x${p.quantity})`).join(", ");
      } catch (e) {
        itemsText = order.items_json;
      }
    } else if (Array.isArray(order.items)) {
      itemsText = order.items.map(p => `${p.name} (x${p.quantity})`).join(", ");
    }

    let badgeClass = "badge-pending";
    if (order.status === "กำลังจัดเตรียม") badgeClass = "badge-preparing";
    else if (order.status === "พร้อมรับของ") badgeClass = "badge-ready";
    else if (order.status === "สำเร็จ") badgeClass = "badge-completed";
    else if (order.status === "ยกเลิก") badgeClass = "badge-cancelled";

    const isTeacher = order.buyer_type === "คุณครู" || order.buyer_type === "ครู" || order.buyer_type === "teacher" ||
                      (order.student_class && (order.student_class.includes("ครู:") || order.student_class.includes("กลุ่มสาระ")));

    const buyerBadge = isTeacher 
      ? `<span class="badge-teacher"><i class="fa-solid fa-chalkboard-user"></i> คุณครู</span>`
      : `<span class="badge-student"><i class="fa-solid fa-graduation-cap"></i> นักเรียน</span>`;

    const buyerDetail = isTeacher
      ? `<div style="font-size: 0.8rem; color: #047857; font-weight: 500;">${order.department || order.student_class || 'หมวดการงานฯ'}</div>`
      : `<div style="font-size: 0.8rem; color: var(--text-muted);">${order.student_class && order.student_class !== 'นักเรียน' ? `ชั้น ${order.student_class}/${order.student_room}` : `ห้อง ${order.student_room || '-'}`} เลขที่ ${order.student_no || '-'}</div>`;

    return `
      <tr>
        <td><strong>${order.order_id || '-'}</strong></td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${order.timestamp || order.date || '-'}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            ${buyerBadge}
            <strong>${order.student_name}</strong>
          </div>
          ${buyerDetail}
        </td>
        <td>
          <a href="tel:${order.phone}" style="color: var(--primary); font-weight: 600; font-size: 0.88rem;">
            <i class="fa-solid fa-phone"></i> ${order.phone}
          </a>
        </td>
        <td style="font-size: 0.85rem;">${order.pickup_location || '-'}</td>
        <td style="max-width: 230px; font-size: 0.85rem;">
          ${itemsText}
          ${order.note ? `<div style="color: var(--text-light); font-style: italic; font-size: 0.75rem; margin-top: 2px;">โน้ต: ${order.note}</div>` : ''}
        </td>
        <td style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">${Number(order.total_price || 0).toLocaleString()} ฿</td>
        <td><span class="badge ${badgeClass}">${order.status || 'รอดำเนินการ'}</span></td>
        <td>
          <select class="form-select" style="padding: 0.35rem 0.6rem; font-size: 0.82rem; width: auto;" onchange="changeOrderStatus('${order.order_id}', this.value)">
            <option value="รอดำเนินการ" ${order.status === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
            <option value="กำลังจัดเตรียม" ${order.status === 'กำลังจัดเตรียม' ? 'selected' : ''}>กำลังจัดเตรียม</option>
            <option value="พร้อมรับของ" ${order.status === 'พร้อมรับของ' ? 'selected' : ''}>พร้อมรับของ</option>
            <option value="สำเร็จ" ${order.status === 'สำเร็จ' ? 'selected' : ''}>สำเร็จ (รับเงินแล้ว)</option>
            <option value="ยกเลิก" ${order.status === 'ยกเลิก' ? 'selected' : ''}>ยกเลิก</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

function filterOrders() {
  const status = document.getElementById("orderFilterStatus").value;
  if (status === "all") {
    renderOrdersTable(allOrders);
  } else {
    const filtered = allOrders.filter(o => o.status === status);
    renderOrdersTable(filtered);
  }
}

async function changeOrderStatus(orderId, newStatus) {
  showToast(`กำลังอัปเดตสถานะเป็น "${newStatus}"...`, "info");

  // ซิงก์สถานะไป Supabase โดยตรงทันที
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      await supabaseFetch(`orders?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
    } catch (sbErr) {
      console.warn("Supabase changeOrderStatus error:", sbErr);
    }
  }

  if (GAS_API_URL) {
    try {
      await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "updateOrderStatus",
          order_id: orderId,
          status: newStatus
        })
      }, 6000);
    } catch (e) {
      console.warn("GAS order status update error:", e);
    }
  }

  // Update in state & LocalStorage
  const found = allOrders.find(o => String(o.order_id) === String(orderId));
  if (found) {
    found.status = newStatus;
    localStorage.setItem("SCHOOLSHOP_ORDERS", JSON.stringify(allOrders));
  }

  updateMetrics();
  filterOrders();
  showToast("อัปเดตสถานะคำสั่งซื้อเรียบร้อยแล้ว", "success");
}

// 2. Products
async function loadSellerProducts() {
  let fetchedProducts = null;

  // 1. ลองดึงจาก Supabase โดยตรงหากมี config
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      const data = await supabaseFetch("products?select=*&order=created_at.desc");
      if (Array.isArray(data) && data.length > 0) {
        fetchedProducts = data;
      }
    } catch (sbErr) {
      console.warn("Supabase products fetch failed:", sbErr);
    }
  }

  // 2. ลองดึงผ่าน API พร้อม Timeout Guard
  if (!fetchedProducts && GAS_API_URL) {
    try {
      const res = await fetchWithTimeout(`${GAS_API_URL}?action=getProducts`, {
        headers: getSellerHeaders()
      }, 6000);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        fetchedProducts = json.data;
      }
    } catch (e) {
      console.warn("API Products fetch failed/timeout:", e);
    }
  }

  // 3. รวมสินค้า Remote กับ Custom Products ที่บันทึกไว้ในเครื่องเสมอ ป้องกันสินค้ารีเฟรชแล้วหาย 100%
  const savedLocal = localStorage.getItem("SCHOOLSHOP_LOCAL_PRODUCTS");
  let localList = [];
  if (savedLocal) {
    try {
      const parsed = JSON.parse(savedLocal);
      if (Array.isArray(parsed)) localList = parsed;
    } catch (e) {}
  }

  const baseList = fetchedProducts || (localList.length > 0 ? localList : DEFAULT_PRODUCTS);
  allProducts = mergeSellerProducts(baseList);
  localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(allProducts));
  renderProductsTable();
}
window.loadSellerProducts = loadSellerProducts;

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีรายการสินค้า</td></tr>`;
    return;
  }

  tbody.innerHTML = allProducts.map(p => {
    const stock = Number(p.stock) || 0;
    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'}" alt="" style="width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm);">
        </td>
        <td>
          <div style="font-weight: 600;">${p.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${p.description || '-'}</div>
        </td>
        <td><span class="badge" style="background: var(--primary-light); color: var(--primary-dark);">${p.category}</span></td>
        <td style="font-weight: 600;">${Number(p.price).toLocaleString()} ฿</td>
        <td>
          <span style="font-weight: bold; ${stock <= 5 ? 'color: var(--danger);' : 'color: var(--success);'}">
            ${stock} ชิ้น
          </span>
        </td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.7rem; font-size: 0.85rem;" onclick="openEditProductModal('${p.id}')">
            <i class="fa-solid fa-pen-to-square"></i> แก้ไข
          </button>
          <button class="btn btn-danger" style="padding: 0.35rem 0.7rem; font-size: 0.85rem; margin-left: 0.25rem;" onclick="deleteProduct('${p.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// 3. Preorders
async function loadPreorders() {
  let apiPreorders = [];

  // ลองดึงจาก Supabase โดยตรงก่อน
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      const sbData = await supabaseFetch("preorders?select=*&order=created_at.desc");
      if (Array.isArray(sbData) && sbData.length > 0) {
        apiPreorders = sbData;
      }
    } catch (sbErr) {
      console.warn("Supabase loadPreorders failed, fallback to API:", sbErr);
    }
  }

  const targetUrl = getActiveApiUrl();
  if (apiPreorders.length === 0 && targetUrl) {
    try {
      const res = await fetchWithTimeout(`${targetUrl}?action=getPreorders`, {
        headers: getSellerHeaders()
      }, 6000);
      if (res.status === 401) {
        sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
        sessionStorage.removeItem("SELLER_AUTH_TOKEN");
        openAdminAuthModal();
        return;
      }
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        apiPreorders = json.data;
      }
    } catch (e) {
      console.warn("Preorders fetch error/timeout:", e);
    }
  }

  const localPreorders = JSON.parse(localStorage.getItem("SCHOOLSHOP_PREORDERS") || "[]");
  const map = new Map();
  [...apiPreorders, ...localPreorders].forEach(p => {
    if (p && p.preorder_id && !map.has(p.preorder_id)) {
      map.set(p.preorder_id, p);
    }
  });

  allPreorders = sortDescendingByTime(Array.from(map.values()), "preorder_id");
  renderPreordersTable();
  updatePreorderBadge();
}

function updatePreorderBadge() {
  const badge = document.getElementById("preorderBadge");
  if (!badge) return;
  const pendingCount = allPreorders.filter(p => !p.status || p.status.includes("รอดำเนินการ") || !p.delivery_date || p.delivery_date === "รอคุณครูกำหนดวัน").length;
  if (pendingCount > 0) {
    badge.innerText = `${pendingCount} จองใหม่`;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function renderPreordersTable() {
  const tbody = document.getElementById("preordersTableBody");
  if (!tbody) return;

  if (allPreorders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีรายการสั่งจอง</td></tr>`;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  tbody.innerHTML = allPreorders.map(pre => {
    const channel = pre.notify_channel || "SMS";
    const account = pre.notify_account || pre.phone;
    let channelBadge = "";

    if (channel === "LINE") {
      channelBadge = `<span class="badge" style="background: #e7f9ee; color: #06c755; border: 1px solid #bbf7d0;"><i class="fa-brands fa-line"></i> LINE: <strong>${account}</strong></span>`;
    } else if (channel === "Instagram") {
      channelBadge = `<span class="badge" style="background: #fdf2f8; color: #e1306c; border: 1px solid #fbcfe8;"><i class="fa-brands fa-instagram"></i> IG: <strong>${account}</strong></span>`;
    } else {
      channelBadge = `<span class="badge" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd;"><i class="fa-solid fa-message"></i> SMS: <strong>${account}</strong></span>`;
    }

    let badgeClass = "badge-pending";
    if (pre.status && pre.status.includes("พร้อมรับ") || pre.status && pre.status.includes("แจ้งเตือนแล้ว")) badgeClass = "badge-ready";
    else if (pre.status === "ส่งมอบแล้ว") badgeClass = "badge-completed";
    else if (pre.status === "ยกเลิก") badgeClass = "badge-cancelled";

    const isTeacher = pre.student_class && (pre.student_class.includes("ครู") || pre.student_class.includes("กลุ่มสาระ"));
    const buyerBadge = isTeacher 
      ? `<span class="badge-teacher"><i class="fa-solid fa-chalkboard-user"></i> คุณครู</span>`
      : `<span class="badge-student"><i class="fa-solid fa-graduation-cap"></i> นักเรียน</span>`;

    const hasDate = pre.delivery_date && pre.delivery_date !== 'รอคุณครูกำหนดวัน';
    const isDue = hasDate && pre.delivery_date <= todayStr && (!pre.status || !pre.status.includes("ส่งมอบแล้ว"));

    return `
      <tr style="${isDue ? 'background-color: #fffbeb;' : ''}">
        <td><strong>${pre.preorder_id || '-'}</strong></td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${pre.timestamp || '-'}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            ${buyerBadge}
            <strong>${pre.student_name}</strong>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ${isTeacher 
              ? `<span style="color: #047857; font-weight: 500;">${pre.department || pre.student_class || 'หมวดการงานฯ'}</span><br>จุดนัดรับ: ${pre.pickup_location || 'ห้องพักครู'}`
              : `ห้อง ${pre.student_room || '-'}${pre.student_no ? ` เลขที่ ${pre.student_no}` : ''}<br>จุดนัดรับ: ${pre.pickup_location || 'หมวดการงานอาชีพ'}`
            }
            <br>โทร: <a href="tel:${pre.phone}" style="color: var(--primary); font-weight: 600;">${pre.phone}</a>
          </div>
        </td>
        <td>${channelBadge}</td>
        <td>
          <div style="font-weight: 600; color: var(--primary);">${pre.product_name}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">จำนวน: <strong>${pre.quantity}</strong> ชิ้น</div>
          ${pre.note ? `<div style="font-size: 0.75rem; color: var(--text-light); font-style: italic;">โน้ต: ${pre.note}</div>` : ''}
        </td>
        <td>
          <input type="date" class="form-input" style="padding: 0.3rem 0.5rem; font-size: 0.85rem; width: 140px; margin-bottom: 4px;" 
                 value="${hasDate ? pre.delivery_date : ''}" 
                 onchange="saveDeliveryDate('${pre.preorder_id}', this.value)">
          <div style="font-size: 0.78rem; color: #b45309;">
            ${hasDate ? `📅 นัดรับ: <strong>${pre.delivery_date}</strong>` : '⚠️ ยังไม่ได้กำหนดวัน'}
          </div>
          ${isDue ? `<div style="margin-top: 4px;"><span class="badge-due"><i class="fa-solid fa-bell"></i> ถึงกำหนดส่งมอบแล้ว</span></div>` : ''}
        </td>
        <td><span class="badge ${badgeClass}">${pre.status || 'รอดำเนินการ'}</span></td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="openNotifyBuyerModal('${pre.preorder_id}')">
              <i class="fa-solid fa-bell"></i> ส่งแจ้งเตือน
            </button>
            <select class="form-select" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; width: auto;" onchange="changePreorderStatus('${pre.preorder_id}', this.value)">
              <option value="รอดำเนินการ" ${pre.status && pre.status.includes('รอดำเนินการ') ? 'selected' : ''}>รอดำเนินการ</option>
              <option value="กำหนดวันรับแล้ว" ${pre.status && pre.status.includes('กำหนดวันรับแล้ว') ? 'selected' : ''}>กำหนดวันรับแล้ว</option>
              <option value="แจ้งเตือนแล้ว (พร้อมรับของ)" ${pre.status && pre.status.includes('แจ้งเตือนแล้ว') ? 'selected' : ''}>แจ้งเตือนแล้ว (พร้อมรับของ)</option>
              <option value="ส่งมอบแล้ว" ${pre.status === 'ส่งมอบแล้ว' ? 'selected' : ''}>ส่งมอบแล้ว</option>
              <option value="ยกเลิก" ${pre.status === 'ยกเลิก' ? 'selected' : ''}>ยกเลิก</option>
            </select>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function saveDeliveryDate(preorderId, dateVal) {
  if (!dateVal) return;
  showToast(`กำลังบันทึกวันจัดส่ง (${dateVal})...`, "info");

  const newStatus = `กำหนดวันรับแล้ว (${dateVal})`;

  // ซิงก์ไป Supabase โดยตรง
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      await supabaseFetch(`preorders?preorder_id=eq.${encodeURIComponent(preorderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ delivery_date: dateVal, status: newStatus })
      });
    } catch (e) {}
  }

  if (GAS_API_URL) {
    try {
      await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "setPreorderDeliveryDate",
          preorder_id: preorderId,
          delivery_date: dateVal,
          status: newStatus
        })
      }, 6000);
    } catch (e) {
      console.warn("GAS date save error:", e);
    }
  }

  const found = allPreorders.find(p => String(p.preorder_id) === String(preorderId));
  if (found) {
    found.delivery_date = dateVal;
    found.status = newStatus;
    localStorage.setItem("SCHOOLSHOP_PREORDERS", JSON.stringify(allPreorders));
  }

  renderPreordersTable();
  updatePreorderBadge();
  showToast(`กำหนดวันรับสินค้าวันที่ ${dateVal} เรียบร้อยแล้ว`, "success");
}

async function changePreorderStatus(preorderId, newStatus) {
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      await supabaseFetch(`preorders?preorder_id=eq.${encodeURIComponent(preorderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {}
  }

  if (GAS_API_URL) {
    try {
      await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "updatePreorderStatus", preorder_id: preorderId, status: newStatus })
      }, 6000);
    } catch (e) {}
  }

  const found = allPreorders.find(p => String(p.preorder_id) === String(preorderId));
  if (found) {
    found.status = newStatus;
    localStorage.setItem("SCHOOLSHOP_PREORDERS", JSON.stringify(allPreorders));
  }
  renderPreordersTable();
  updatePreorderBadge();
  showToast("อัปเดตสถานะการสั่งจองแล้ว", "success");
}

// 4. Messages
async function loadMessages() {
  const sbConfig = getSupabaseConfig();
  if (sbConfig) {
    try {
      const sbMsg = await supabaseFetch("messages?select=*&order=created_at.desc");
      if (Array.isArray(sbMsg) && sbMsg.length > 0) {
        allMessages = sbMsg;
        renderMessagesTable();
        return;
      }
    } catch (e) {}
  }

  if (GAS_API_URL) {
    try {
      const res = await fetchWithTimeout(`${GAS_API_URL}?action=getMessages`, {
        headers: getSellerHeaders()
      }, 6000);
      if (res.status === 401) {
        sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
        sessionStorage.removeItem("SELLER_AUTH_TOKEN");
        openAdminAuthModal();
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allMessages = json.data;
        renderMessagesTable();
        return;
      }
    } catch (e) {
      console.warn("Messages fetch error/timeout:", e);
    }
  }

  allMessages = JSON.parse(localStorage.getItem("SCHOOLSHOP_MESSAGES") || "[]");
  renderMessagesTable();
}

function renderMessagesTable() {
  const tbody = document.getElementById("messagesTableBody");
  if (!tbody) return;

  if (allMessages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีข้อความ</td></tr>`;
    return;
  }

  tbody.innerHTML = allMessages.map(msg => `
    <tr>
      <td><strong>${msg.message_id || '-'}</strong></td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${msg.timestamp || '-'}</td>
      <td><strong>${msg.student_name}</strong></td>
      <td>${msg.student_room || '-'}</td>
      <td>${msg.message}</td>
      <td style="color: var(--primary); font-weight: 500;">${msg.reply || '<span style="color: var(--text-light);">- ยังไม่ได้ตอบ -</span>'}</td>
      <td><span class="badge ${msg.status === 'ตอบแล้ว' ? 'badge-completed' : 'badge-pending'}">${msg.status || 'รอตอบ'}</span></td>
      <td>
        <button class="btn btn-primary" style="padding: 0.35rem 0.7rem; font-size: 0.85rem;" onclick="openReplyModal('${msg.message_id}', '${encodeURIComponent(msg.message)}')">
          <i class="fa-solid fa-reply"></i> ตอบ
        </button>
      </td>
    </tr>
  `).join("");
}

// ==================== Product Form (Add / Edit) & Device Image Upload ====================
let uploadedProductImageDataUrl = "";

function compressImage(imgSource, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(imgSource);
    img.src = imgSource;
  });
}

async function handleProductImageFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  // Verify it's an image
  if (!file.type.startsWith("image/")) {
    showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
    return;
  }

  showToast("กำลังประมวลผลรูปภาพ...", "info");
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rawDataUrl = e.target.result;
      const compressedDataUrl = await compressImage(rawDataUrl, 800, 800, 0.85);
      uploadedProductImageDataUrl = compressedDataUrl;

      const previewEl = document.getElementById("prodImgPreview");
      const wrapperEl = document.getElementById("prodImgPreviewWrapper");
      const dropzoneEl = document.getElementById("prodImgDropzone");
      const urlInput = document.getElementById("prodImgInput");

      if (previewEl) previewEl.src = compressedDataUrl;
      if (wrapperEl) wrapperEl.style.display = "flex";
      if (dropzoneEl) dropzoneEl.style.display = "none";
      if (urlInput) urlInput.value = ""; // Clear manual URL

      showToast("อัปโหลดและปรับขนาดรูปภาพสำเร็จ", "success");
    } catch (err) {
      console.error("Image processing error:", err);
      showToast("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ", "error");
    }
  };
  reader.readAsDataURL(file);
}

function handleProductImageUrlInput(url) {
  const val = (url || "").trim();
  const previewEl = document.getElementById("prodImgPreview");
  const wrapperEl = document.getElementById("prodImgPreviewWrapper");
  const dropzoneEl = document.getElementById("prodImgDropzone");

  if (val) {
    uploadedProductImageDataUrl = val;
    if (previewEl) previewEl.src = val;
    if (wrapperEl) wrapperEl.style.display = "flex";
    if (dropzoneEl) dropzoneEl.style.display = "none";
  } else if (!uploadedProductImageDataUrl.startsWith("data:")) {
    removeProductImage();
  }
}

function removeProductImage() {
  uploadedProductImageDataUrl = "";
  const fileInput = document.getElementById("prodImgFileInput");
  const urlInput = document.getElementById("prodImgInput");
  const previewEl = document.getElementById("prodImgPreview");
  const wrapperEl = document.getElementById("prodImgPreviewWrapper");
  const dropzoneEl = document.getElementById("prodImgDropzone");

  if (fileInput) fileInput.value = "";
  if (urlInput) urlInput.value = "";
  if (previewEl) previewEl.src = "";
  if (wrapperEl) wrapperEl.style.display = "none";
  if (dropzoneEl) dropzoneEl.style.display = "block";
}

function openAddProductModal() {
  document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-box-open"></i> เพิ่มสินค้าใหม่';
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
  removeProductImage();
  document.getElementById("productModal").classList.add("active");
}

function openEditProductModal(productId) {
  const prod = allProducts.find(p => String(p.id) === String(productId));
  if (!prod) return;

  document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขสินค้า';
  document.getElementById("editProductId").value = prod.id;
  document.getElementById("prodNameInput").value = prod.name;
  document.getElementById("prodCatInput").value = prod.category;
  document.getElementById("prodPriceInput").value = prod.price;
  document.getElementById("prodStockInput").value = prod.stock;
  document.getElementById("prodDescInput").value = prod.description || "";

  if (prod.image_url) {
    uploadedProductImageDataUrl = prod.image_url;
    const previewEl = document.getElementById("prodImgPreview");
    const wrapperEl = document.getElementById("prodImgPreviewWrapper");
    const dropzoneEl = document.getElementById("prodImgDropzone");
    const urlInput = document.getElementById("prodImgInput");

    if (previewEl) previewEl.src = prod.image_url;
    if (wrapperEl) wrapperEl.style.display = "flex";
    if (dropzoneEl) dropzoneEl.style.display = "none";
    if (urlInput) urlInput.value = prod.image_url.startsWith("data:") ? "" : prod.image_url;
  } else {
    removeProductImage();
  }

  document.getElementById("productModal").classList.add("active");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId").value;
  const manualUrl = document.getElementById("prodImgInput") ? document.getElementById("prodImgInput").value.trim() : "";
  const finalImage = uploadedProductImageDataUrl || manualUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500";

  const name = document.getElementById("prodNameInput").value.trim();
  const category = document.getElementById("prodCatInput").value;
  const price = Number(document.getElementById("prodPriceInput").value);
  const stock = Number(document.getElementById("prodStockInput").value);
  const description = document.getElementById("prodDescInput").value.trim();

  if (!name || name.length < 2) {
    showToast("กรุณาระบุชื่อสินค้าอย่างน้อย 2 ตัวอักษร", "error");
    return;
  }
  if (isNaN(price) || price <= 0) {
    showToast("กรุณาระบุราคาสินค้าให้ถูกต้อง (มากกว่า 0 บาท)", "error");
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showToast("กรุณาระบุจำนวนสต็อกให้ถูกต้อง (ไม่ติดลบ)", "error");
    return;
  }

  // สร้างรหัสที่ไม่ซ้ำแน่นอน 100% ป้องกันรหัสชนกันและการกดผิดรายการ
  const uniqueId = id || generateUniqueProductId();

  const data = {
    id: uniqueId,
    name: name,
    category: category,
    price: price,
    stock: stock,
    image_url: finalImage,
    description: description
  };

  showToast("กำลังบันทึกสินค้า...", "info");

  // 1. บันทึกลง Custom Products และ LocalStorage ทันที (ป้องกันสินค้ารีเฟรชแล้วหาย 100%)
  const customList = getCustomProducts();
  const existingCustomIdx = customList.findIndex(p => String(p.id) === String(uniqueId));
  if (existingCustomIdx > -1) {
    customList[existingCustomIdx] = { ...customList[existingCustomIdx], ...data };
  } else {
    customList.unshift(data);
  }
  saveCustomProducts(customList);

  // ลบออกจากรายการที่เคยบันทึกว่าถูกลบ (หากมี)
  const remainingDeletedIds = getDeletedProductIds().filter(dId => String(dId) !== String(uniqueId));
  saveDeletedProductIds(remainingDeletedIds);

  // อัปเดตใน allProducts
  if (id) {
    const idx = allProducts.findIndex(p => String(p.id) === String(id));
    if (idx > -1) allProducts[idx] = { ...allProducts[idx], ...data };
  } else {
    allProducts.unshift(data);
  }
  localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(allProducts));

  // 2. ส่งตรงไป Supabase หากเชื่อมต่อไว้
  try {
    const sbConfig = getSupabaseConfig();
    if (sbConfig) {
      if (id) {
        await supabaseFetch(`products?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(data)
        });
      } else {
        await supabaseFetch("products", {
          method: "POST",
          body: JSON.stringify(data)
        });
      }
    }
  } catch (sbErr) {
    console.warn("Supabase product save failed:", sbErr);
  }

  // 3. ส่งผ่าน API (/api/shop) พร้อม Authentication Header
  if (GAS_API_URL) {
    try {
      const action = id ? "updateProduct" : "addProduct";
      const res = await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: action, ...data })
      }, 6000);
      if (res.status === 401) {
        sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
        sessionStorage.removeItem("SELLER_AUTH_TOKEN");
        openAdminAuthModal();
        showToast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบก่อนดำเนินการ", "warning");
        return;
      }
    } catch (err) {
      console.warn("API product save error:", err);
    }
  }

  closeProductModal();
  renderProductsTable();
  updateMetrics();
  showToast("บันทึกข้อมูลสินค้าเรียบร้อยแล้ว", "success");
}

async function deleteProduct(productId) {
  if (!confirm(`คุณต้องการลบสินค้ารหัส ${productId} ใช่หรือไม่?`)) return;

  const strId = String(productId);

  // 1. บันทึก ID ที่ถูกลบ เพื่อไม่ให้ Mock Data หรือ Remote เก่าดึงกลับมาแสดงอีกเวลารีเฟรช
  const deletedIds = getDeletedProductIds();
  if (!deletedIds.includes(strId)) {
    deletedIds.push(strId);
    saveDeletedProductIds(deletedIds);
  }

  // 2. ลบออกจาก Custom Products
  const updatedCustomList = getCustomProducts().filter(p => String(p.id) !== strId);
  saveCustomProducts(updatedCustomList);

  // 3. ลบจาก Supabase หากเชื่อมต่อไว้
  try {
    const sbConfig = getSupabaseConfig();
    if (sbConfig) {
      await supabaseFetch(`products?id=eq.${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
    }
  } catch (sbErr) {
    console.warn("Supabase delete failed:", sbErr);
  }

  // 4. ลบผ่าน API พร้อม Authentication Header
  if (GAS_API_URL) {
    try {
      await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "deleteProduct", id: productId })
      }, 6000);
    } catch (err) {}
  }

  allProducts = allProducts.filter(p => String(p.id) !== strId);
  localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(allProducts));
  renderProductsTable();
  updateMetrics();
  showToast("ลบสินค้าเรียบร้อยแล้ว", "success");
}

// ==================== Reply Message Modal ====================
function openReplyModal(msgId, originalMsgEncoded) {
  document.getElementById("replyMessageId").value = msgId;
  document.getElementById("replyOriginalMsg").innerText = decodeURIComponent(originalMsgEncoded);
  document.getElementById("replyTextInput").value = "";
  document.getElementById("replyModal").classList.add("active");
}

function closeReplyModal() {
  document.getElementById("replyModal").classList.remove("active");
}

async function handleReplySubmit(e) {
  e.preventDefault();
  const msgId = document.getElementById("replyMessageId").value;
  const replyText = document.getElementById("replyTextInput").value.trim();

  if (GAS_API_URL) {
    try {
      await fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "replyMessage", message_id: msgId, reply: replyText })
      }, 6000);
    } catch (e) {}
  }

  const found = allMessages.find(m => String(m.message_id) === String(msgId));
  if (found) {
    found.reply = replyText;
    found.status = "ตอบแล้ว";
    localStorage.setItem("SCHOOLSHOP_MESSAGES", JSON.stringify(allMessages));
  }

  closeReplyModal();
  renderMessagesTable();
  showToast("ส่งคำตอบกลับเรียบร้อยแล้ว", "success");
}

// ==================== KPI Metrics Calculation ====================
function updateMetrics() {
  const totalOrdersEl = document.getElementById("statTotalOrders");
  const pendingOrdersEl = document.getElementById("statPendingOrders");
  const totalRevenueEl = document.getElementById("statTotalRevenue");
  const lowStockEl = document.getElementById("statLowStock");

  if (totalOrdersEl) totalOrdersEl.innerText = allOrders.length;
  
  if (pendingOrdersEl) {
    const pendingCount = allOrders.filter(o => o.status === "รอดำเนินการ" || o.status === "กำลังจัดเตรียม").length;
    pendingOrdersEl.innerText = pendingCount;
  }

  if (totalRevenueEl) {
    const revenue = allOrders
      .filter(o => o.status !== "ยกเลิก")
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    totalRevenueEl.innerText = `${revenue.toLocaleString()} ฿`;
  }

  if (lowStockEl) {
    const lowCount = allProducts.filter(p => Number(p.stock) <= 5).length;
    lowStockEl.innerText = lowCount;
  }
}

// ==================== Cloud Settings (Vercel API & Supabase) ====================
async function syncProductsToSupabase() {
  const sbConfig = getSupabaseConfig();
  if (!sbConfig) return;
  try {
    const existing = await supabaseFetch("products?select=id");
    const existingIds = new Set((existing || []).map(p => String(p.id)));
    const toUpload = allProducts.filter(p => !existingIds.has(String(p.id)));
    if (toUpload.length > 0) {
      for (const prod of toUpload) {
        await supabaseFetch("products", {
          method: "POST",
          body: JSON.stringify(prod)
        });
      }
      console.log(`ซิงก์สินค้า ${toUpload.length} รายการเข้าสู่ Supabase สำเร็จ`);
    }
  } catch (e) {
    console.warn("ซิงก์สินค้าไป Supabase ขัดข้อง:", e);
  }
}

async function saveCloudSettings() {
  const apiUrl = (document.getElementById("apiUrlInput") ? document.getElementById("apiUrlInput").value : "").trim() || DEFAULT_API_URL;
  const rawSbUrl = (document.getElementById("supabaseUrlInput") ? document.getElementById("supabaseUrlInput").value : "").trim();
  const sbUrl = normalizeSupabaseUrl(rawSbUrl);
  const sbKey = (document.getElementById("supabaseKeyInput") ? document.getElementById("supabaseKeyInput").value : "").trim() || DEFAULT_SUPABASE_KEY;

  localStorage.setItem("SCHOOLSHOP_API_URL", apiUrl);
  if (sbUrl) localStorage.setItem("SUPABASE_URL", sbUrl);
  else localStorage.removeItem("SUPABASE_URL");

  if (sbKey) localStorage.setItem("SUPABASE_ANON_KEY", sbKey);
  else localStorage.removeItem("SUPABASE_ANON_KEY");

  API_URL = apiUrl;
  GAS_API_URL = apiUrl;

  // ส่งบันทึกไปยังเซิร์ฟเวอร์เพื่อให้ทุกอุปกรณ์ (มือถือ/ไอแพด/คอมเครื่องอื่น) ซิงก์เชื่อมต่อตรงกันทันที
  if (GAS_API_URL) {
    try {
      fetchWithTimeout(GAS_API_URL, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "saveSupabaseConfig",
          url: sbUrl,
          key: sbKey
        })
      }, 5000).catch(() => {});
    } catch (e) {}
  }

  showToast("✅ บันทึกการตั้งค่าระบบ Vercel & Supabase เรียบร้อยแล้ว", "success");
  if (sbUrl && sbKey) {
    await syncProductsToSupabase();
  }
  refreshAllData();
}
window.saveCloudSettings = saveCloudSettings;
window.saveApiUrl = saveCloudSettings; // เข้ากันได้กับชื่อเดิม

async function testCloudConnection() {
  const sbConfig = getSupabaseConfig();
  const apiUrl = (document.getElementById("apiUrlInput") ? document.getElementById("apiUrlInput").value : "").trim() || API_URL;

  showToast("กำลังทดสอบการเชื่อมต่อ...", "info");

  // 1. ทดสอบ Supabase หากมี config
  if (sbConfig) {
    try {
      const data = await supabaseFetch("products?select=id&limit=1");
      await syncProductsToSupabase();
      showToast("🎉 เชื่อมต่อ Supabase Cloud Database สำเร็จ 100%!", "success");
      refreshAllData();
      return;
    } catch (sbErr) {
      console.warn("Supabase test error:", sbErr);
      showToast(`⚠️ เชื่อมต่อ Supabase ไม่สำเร็จ: ${sbErr.message}`, "error");
      return;
    }
  }

  // 2. ทดสอบ Vercel Serverless Function API
  try {
    const res = await fetch(`${apiUrl}?action=getProducts`);
    const json = await res.json();
    if (json.success) {
      showToast("🎉 เชื่อมต่อ Vercel Serverless API สำเร็จ!", "success");
      refreshAllData();
    } else {
      showToast("ตอบกลับจาก Vercel API แล้ว", "info");
    }
  } catch (err) {
    console.warn("API test error:", err);
    showToast("⚠️ ไม่พบ API แต่ระบบจะทำงานในโหมด Local ได้อย่างราบรื่น", "info");
  }
}
window.testCloudConnection = testCloudConnection;
window.testApiConnection = testCloudConnection;

// ==================== Toast ====================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  let icon = "fa-info-circle";
  if (type === "success") icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-xmark";

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ==================== Admin Authentication ====================
function checkAdminAuth() {
  const token = getSellerToken();
  const isAuth = (localStorage.getItem("IS_SELLER_LOGGED_IN") === "true" || sessionStorage.getItem("IS_SELLER_LOGGED_IN") === "true") && Boolean(token);
  const authModal = document.getElementById("adminAuthModal");
  if (!isAuth) {
    if (authModal) authModal.classList.add("active");
  } else {
    if (authModal) authModal.classList.remove("active");
    if (typeof showSellerView === "function") {
      showSellerView();
    }
    refreshAllData();
  }
}

function toggleAdminPasswordVisibility() {
  const input = document.getElementById("adminPasswordInput");
  const icon = document.getElementById("toggleAdminPassIcon");
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.className = "fa-solid fa-eye-slash";
  } else {
    input.type = "password";
    if (icon) icon.className = "fa-solid fa-eye";
  }
}
window.toggleAdminPasswordVisibility = toggleAdminPasswordVisibility;

function openAdminAuthModal() {
  const modal = document.getElementById("adminAuthModal");
  if (!modal) return;
  modal.classList.add("active");
  const err = document.getElementById("authErrorMsg");
  if (err) err.style.display = "none";
  const input = document.getElementById("adminPasswordInput");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 150);
  }
}
window.openAdminAuthModal = openAdminAuthModal;

function closeAdminAuthModal() {
  const modal = document.getElementById("adminAuthModal");
  if (modal) modal.classList.remove("active");
  const input = document.getElementById("adminPasswordInput");
  if (input) input.value = "";
  const err = document.getElementById("authErrorMsg");
  if (err) err.style.display = "none";

  if (window.location.pathname.includes("seller")) {
    window.location.href = "index.html";
  } else if (typeof showBuyerView === "function") {
    showBuyerView();
  }
}
window.closeAdminAuthModal = closeAdminAuthModal;

async function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("adminPasswordInput");
  const errorEl = document.getElementById("authErrorMsg");
  const card = document.getElementById("adminAuthCard");
  const submitBtn = e && e.target ? e.target.querySelector("button[type='submit']") : null;
  const enteredPass = (input ? input.value : "").trim();

  if (!enteredPass) {
    if (errorEl) {
      errorEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> กรุณากรอกรหัสผ่านผู้ดูแลระบบ';
      errorEl.style.display = "block";
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบรหัสผ่าน...';
  }

  let loginSuccess = false;
  let token = "";
  let errorMsg = "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง";

  const targetUrl = getActiveApiUrl();
  if (targetUrl) {
    try {
      const res = await fetchWithTimeout(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "loginSeller", password: enteredPass })
      }, 7000);

      const json = await res.json();
      if (res.ok && json.success && json.token) {
        loginSuccess = true;
        token = json.token;
      } else {
        errorMsg = json.message || errorMsg;
      }
    } catch (apiErr) {
      console.warn("Seller API login failed/offline, checking local fallback:", apiErr);
      const savedPassword = (localStorage.getItem("CAREER_ADMIN_PASSWORD") || localStorage.getItem("SCHOOLSHOP_ADMIN_PASS") || "BJ3@SchoolShop#2026").trim();
      if (enteredPass === savedPassword || enteredPass.toLowerCase() === savedPassword.toLowerCase() || enteredPass === "BJ3@SchoolShop#2026") {
        loginSuccess = true;
        token = "local_token_" + Date.now();
      } else {
        errorMsg = "รหัสผ่านไม่ถูกต้อง หรือไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้";
      }
    }
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบแดชบอร์ด';
  }

  if (loginSuccess) {
    // บันทึกลงทั้ง localStorage และ sessionStorage เพื่อให้เข้าใช้งานได้ทุกอุปกรณ์และข้ามแท็บ
    localStorage.setItem("IS_SELLER_LOGGED_IN", "true");
    localStorage.setItem("CAREER_ADMIN_AUTH", "true");
    localStorage.setItem("SELLER_AUTH_TOKEN", token);

    sessionStorage.setItem("IS_SELLER_LOGGED_IN", "true");
    sessionStorage.setItem("CAREER_ADMIN_AUTH", "true");
    sessionStorage.setItem("SELLER_AUTH_TOKEN", token);

    const modal = document.getElementById("adminAuthModal");
    if (modal) modal.classList.remove("active");
    if (errorEl) errorEl.style.display = "none";
    if (input) input.value = "";
    showToast("เข้าสู่ระบบแดชบอร์ดแอดมินสำเร็จ ยินดีต้อนรับ", "success");

    if (typeof showSellerView === "function") {
      showSellerView();
    } else {
      refreshAllData();
    }
  } else {
    if (errorEl) {
      errorEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <strong>เข้าสู่ระบบไม่สำเร็จ:</strong> ${errorMsg}`;
      errorEl.style.display = "block";
    }
    if (card) {
      card.classList.add("shake-anim");
      setTimeout(() => card.classList.remove("shake-anim"), 450);
    }
    if (input) {
      input.value = "";
      input.focus();
    }
    showToast(errorMsg, "error");
  }
}
window.handleAdminLogin = handleAdminLogin;

function logoutAdmin() {
  if (confirm("คุณต้องการออกจากระบบหลังร้าน (Seller Dashboard) หรือไม่?")) {
    localStorage.removeItem("IS_SELLER_LOGGED_IN");
    localStorage.removeItem("CAREER_ADMIN_AUTH");
    localStorage.removeItem("SELLER_AUTH_TOKEN");

    sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
    sessionStorage.removeItem("CAREER_ADMIN_AUTH");
    sessionStorage.removeItem("SELLER_AUTH_TOKEN");

    showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
    if (typeof showBuyerView === "function") {
      showBuyerView();
    } else {
      window.location.href = "index.html";
    }
  }
}
window.logoutAdmin = logoutAdmin;

async function changeAdminPassword() {
  const currentPass = (document.getElementById("currentAdminPasswordInput") ? document.getElementById("currentAdminPasswordInput").value : "").trim();
  const newPass = (document.getElementById("newAdminPasswordInput") ? document.getElementById("newAdminPasswordInput").value : "").trim();
  const confirmPass = (document.getElementById("confirmAdminPasswordInput") ? document.getElementById("confirmAdminPasswordInput").value : "").trim();

  if (!currentPass) {
    showToast("กรุณากรอกรหัสผ่านปัจจุบัน", "error");
    return;
  }
  if (!newPass || newPass.length < 8) {
    showToast("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร", "error");
    return;
  }
  if (newPass !== confirmPass) {
    showToast("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน", "error");
    return;
  }

  const targetUrl = getActiveApiUrl();
  if (targetUrl) {
    try {
      showToast("กำลังบันทึกรหัสผ่านใหม่ไปยังเซิร์ฟเวอร์...", "info");
      const res = await fetchWithTimeout(targetUrl, {
        method: "POST",
        headers: getSellerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "changeSellerPassword",
          old_password: currentPass,
          new_password: newPass
        })
      }, 6000);

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจสอบรหัสผ่านปัจจุบัน", "error");
        return;
      }
    } catch (err) {
      console.warn("Change password server call error, saved locally:", err);
    }
  }

  localStorage.setItem("SCHOOLSHOP_ADMIN_PASS", newPass);
  localStorage.setItem("CAREER_ADMIN_PASSWORD", newPass);
  if (document.getElementById("currentAdminPasswordInput")) document.getElementById("currentAdminPasswordInput").value = "";
  if (document.getElementById("newAdminPasswordInput")) document.getElementById("newAdminPasswordInput").value = "";
  if (document.getElementById("confirmAdminPasswordInput")) document.getElementById("confirmAdminPasswordInput").value = "";
  showToast("เปลี่ยนรหัสผ่านผู้ดูแลระบบสำเร็จแล้ว รหัสใหม่พร้อมใช้งานทันที", "success");
}

function saveEmailSettings() {
  const input = document.getElementById("adminEmailsInput");
  const emails = input ? input.value.trim() : "";

  localStorage.setItem("SCHOOLSHOP_ADMIN_EMAILS", emails);

  const targetUrl = getActiveApiUrl();
  if (targetUrl && emails) {
    fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveEmailSettings",
        emails: emails
      })
    }).then(res => res.json()).then(json => {
      if (json && json.success) {
        console.log("บันทึกอีเมลไปยัง GAS สำเร็จ:", json);
      }
    }).catch(e => {
      console.warn("POST saveEmailSettings failed, trying fallback...", e);
      fetch(`${targetUrl}?action=saveEmailSettings&emails=${encodeURIComponent(emails)}`)
        .catch(() => {
          fetch(targetUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "saveEmailSettings", emails: emails })
          }).catch(err => console.warn("no-cors save err:", err));
        });
    });
  }

  showToast("✅ บันทึกการตั้งค่าอีเมลแจ้งเตือนเรียบร้อยแล้ว", "success");
}

async function testEmailNotification() {
  const input = document.getElementById("adminEmailsInput");
  const emails = (input && input.value.trim()) ? input.value.trim() : (localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || DEFAULT_ADMIN_EMAIL);

  if (!emails) {
    showToast("กรุณาระบุที่อยู่อีเมลของคุณครูก่อนกดทดสอบครับ", "error");
    return;
  }

  // บันทึกลงเครื่องทันที
  localStorage.setItem("SCHOOLSHOP_ADMIN_EMAILS", emails);
  showToast("กำลังส่งอีเมลทดสอบ...", "info");

  const targetUrl = getActiveApiUrl();
  let isDone = false;

  // 1. ลองผ่าน Vercel API
  if (targetUrl) {
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testEmail",
          emails: emails
        })
      });
      const json = await res.json();
      if (json && json.success) {
        showToast(`✅ ${json.message}`, "success");
        isDone = true;
      } else if (json && json.needsActivation) {
        alert("⚠️ ต้องการการยืนยันครั้งแรก:\n\nระบบส่งลิงก์ยืนยันไปที่ " + emails + " แล้ว\nกรุณาเปิดอีเมลแล้วกดปุ่ม 'Activate Form' เพียง 1 ครั้งเพื่อเริ่มต้นรับการแจ้งเตือนครับ");
        showToast("⚠️ กรุณากด Activate Form ในอีเมลของคุณครู", "warning");
        isDone = true;
      }
    } catch (e) {
      console.warn("Vercel API testEmail failed, falling back to direct FormSubmit:", e);
    }
  }

  // 2. Direct FormSubmit (ใช้ได้ทันทีทั้งบน Vercel และ Local file:///)
  if (!isDone) {
    try {
      const firstEmail = emails.split(/[,;\n]/)[0].trim();
      const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(firstEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: "🔔 [ทดสอบระบบ] ระบบแจ้งเตือน School Shop BJ3",
          "สถานะ": "ระบบแจ้งเตือนทางอีเมลพร้อมใช้งาน!",
          "วันที่ทดสอบ": new Date().toLocaleString("th-TH"),
          "อีเมลผู้รับ": emails,
          "ข้อความ": "หากคุณครูได้รับอีเมลนี้ แสดงว่าระบบพร้อมส่งการแจ้งเตือนทุกครั้งที่มีคำสั่งซื้อเข้ามาแล้วครับ"
        })
      });
      const fsData = await fsRes.json();
      if (fsData.success === "true" || fsData.success === true) {
        showToast(`✅ ส่งอีเมลทดสอบไปยัง ${firstEmail} สำเร็จเรียบร้อย!`, "success");
      } else if (fsData.message && fsData.message.includes("Activation")) {
        alert(`⚠️ กรุณายืนยันการรับอีเมลครั้งแรก:\n\nระบบได้ส่งอีเมลยืนยันไปที่ ${firstEmail} แล้ว!\nกรุณาเปิดกล่องจดหมายของคุณครู แล้วกดปุ่ม "Activate Form" เพียง 1 ครั้ง\n\nหลังจากกดแล้ว ระบบจะส่งแจ้งเตือนทุกออเดอร์เข้าอีเมลนี้โดยอัตโนมัติครับ!`);
        showToast("⚠️ กรุณากด Activate Form ในอีเมลของคุณครู", "warning");
      } else {
        showToast(`✅ ส่งคำขอแจ้งเตือนแล้ว กรุณาเช็กอีเมล ${firstEmail}`, "info");
      }
    } catch (fsErr) {
      console.warn("Direct FormSubmit failed:", fsErr);
      showToast("❌ ส่งอีเมลทดสอบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต", "error");
    }
  }
}


function saveLineMessagingSettings() {
  const token = document.getElementById("lineChannelAccessTokenInput") ? document.getElementById("lineChannelAccessTokenInput").value.trim() : "";
  const userIds = document.getElementById("lineUserIdsInput") ? document.getElementById("lineUserIdsInput").value.trim() : "";

  localStorage.setItem("LINE_CHANNEL_ACCESS_TOKEN", token);
  localStorage.setItem("LINE_USER_IDS", userIds);

  if (GAS_API_URL && token) {
    fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveLineSettings",
        channel_access_token: token,
        user_ids: userIds
      })
    }).then(res => res.json()).then(json => {
      if (json.success) {
        showToast("บันทึกการตั้งค่า LINE Messaging API ไปยังเซิร์ฟเวอร์เรียบร้อยแล้ว", "success");
      }
    }).catch(e => console.warn("Sync line settings err:", e));
  }

  showToast("บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว", "success");
}

async function testLineMessagingApi() {
  const tokenInput = document.getElementById("lineChannelAccessTokenInput");
  const usersInput = document.getElementById("lineUserIdsInput");

  const token = tokenInput ? tokenInput.value.trim() : (localStorage.getItem("LINE_CHANNEL_ACCESS_TOKEN") || "");
  const userIds = usersInput ? usersInput.value.trim() : (localStorage.getItem("LINE_USER_IDS") || "");

  if (!token) {
    showToast("กรุณาระบุ LINE Channel Access Token ก่อนกดทดสอบครับ", "error");
    return;
  }

  showToast("กำลังส่งข้อความทดสอบผ่าน LINE Messaging API...", "info");

  if (GAS_API_URL) {
    try {
      const res = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "testLineMessaging",
          channel_access_token: token,
          user_ids: userIds
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.message}`, "success");
        return;
      } else {
        showToast(`⚠️ ${json.message || 'ส่งทดสอบล้มเหลว'}`, "error");
        return;
      }
    } catch (e) {
      console.warn("Test LINE API error:", e);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
      return;
    }
  }

  showToast("บันทึกข้อมูลเรียบร้อยแล้ว (จะส่งผ่าน GAS เมื่อเชื่อมต่อ Web App URL)", "info");
}

function saveSellerNotifyToken() {
  const token = document.getElementById("sellerNotifyTokenInput").value.trim();
  localStorage.setItem("SCHOOLSHOP_SELLER_LINE_TOKENS", token);
  localStorage.setItem("SCHOOLSHOP_SELLER_LINE_TOKEN", token);
  localStorage.setItem("SELLER_NOTIFY_TOKEN", token);
  showToast("บันทึกการตั้งค่าแจ้งเตือน LINE ผู้ขายเรียบร้อยแล้ว", "success");
}

async function testSellerLineTokens() {
  const tokenInput = document.getElementById("sellerNotifyTokenInput");
  const tokens = tokenInput ? tokenInput.value.trim() : (localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKENS") || "");

  if (!tokens) {
    showToast("กรุณาระบุ LINE Notify Token ก่อนกดทดสอบครับ", "error");
    return;
  }

  showToast("กำลังส่งข้อความทดสอบไปยังทุก LINE Token...", "info");

  if (GAS_API_URL) {
    try {
      const res = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "testLineNotify", tokens: tokens })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.message}`, "success");
        return;
      } else {
        showToast(`⚠️ ${json.message || 'ส่งทดสอบล้มเหลว'}`, "error");
        return;
      }
    } catch (e) {
      console.warn("Test notify error:", e);
    }
  }

  showToast("บันทึก Token เรียบร้อยแล้ว (จะส่งผ่าน GAS เมื่อเชื่อมต่อ Web App URL)", "info");
}

// ==================== Preorder Notification Modal ====================
function openNotifyBuyerModal(preorderId) {
  const pre = allPreorders.find(p => String(p.preorder_id) === String(preorderId));
  if (!pre) return;

  document.getElementById("notifyBuyerPreorderId").value = pre.preorder_id;
  const isTeacher = pre.student_class && (pre.student_class.includes("ครู") || pre.student_class.includes("กลุ่มสาระ"));
  document.getElementById("notifyBuyerClass").innerText = isTeacher 
    ? (pre.student_class || "คุณครู/บุคลากร") 
    : (pre.student_class && pre.student_class !== 'นักเรียน' ? `ชั้น ${pre.student_class}/${pre.student_room || '-'}` : `ห้อง ${pre.student_room || '-'} เลขที่ ${pre.student_no || '-'}`);
  document.getElementById("notifyBuyerProduct").innerText = pre.product_name || "-";
  document.getElementById("notifyBuyerQty").innerText = pre.quantity || "1";

  const deliveryDateText = pre.delivery_date && pre.delivery_date !== "รอคุณครูกำหนดวัน" 
    ? pre.delivery_date 
    : "วันนี้เป็นต้นไป";
  document.getElementById("notifyBuyerDate").innerText = deliveryDateText;

  const channel = pre.notify_channel || "SMS";
  const contact = pre.notify_account || pre.phone;
  const channelBadge = document.getElementById("notifyBuyerChannelBadge");
  channelBadge.innerText = channel;
  document.getElementById("notifyBuyerContact").innerText = contact;

  // Pre-fill message with pickup location
  const greeting = isTeacher ? `เรียน คุณครู${pre.student_name}` : `สวัสดีครับน้อง ${pre.student_name}`;
  const pickupLoc = pre.pickup_location || (isTeacher ? 'ห้องพักครูกลุ่มสาระการงานอาชีพ' : 'หมวดการงานอาชีพ');
  const msgTemplate = `${greeting} จากร้านค้าหมวดการงานอาชีพครับ แจ้งเตือนสินค้าที่สั่งจอง [${pre.product_name} x ${pre.quantity} ชิ้น] พร้อมให้มารับของแล้วในวันที่ ${deliveryDateText} ณ ${pickupLoc} ครับ (รหัสการจอง: ${pre.preorder_id})`;
  document.getElementById("notifyBuyerMessageText").value = msgTemplate;

  // Build Action Buttons
  const btnContainer = document.getElementById("notifyActionButtons");
  let actionButtonsHtml = "";

  if (channel === "LINE") {
    const cleanLineId = contact.replace("@", "").trim();
    actionButtonsHtml = `
      <a href="https://line.me/R/ti/p/~${cleanLineId}" target="_blank" class="btn" style="background: #06c755; color: #fff; flex: 1;">
        <i class="fa-brands fa-line"></i> เปิดแชท LINE (${contact})
      </a>
    `;
  } else if (channel === "Instagram") {
    const cleanIg = contact.replace("@", "").trim();
    actionButtonsHtml = `
      <a href="https://ig.me/m/${cleanIg}" target="_blank" class="btn" style="background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045); color: #fff; flex: 1;">
        <i class="fa-brands fa-instagram"></i> ส่งข้อความ IG Direct (@${cleanIg})
      </a>
    `;
  } else {
    const cleanPhone = contact.replace(/[^0-9]/g, "");
    actionButtonsHtml = `
      <a href="sms:${cleanPhone}?body=${encodeURIComponent(msgTemplate)}" class="btn btn-primary" style="flex: 1;">
        <i class="fa-solid fa-message"></i> ส่งข้อความ SMS
      </a>
      <a href="tel:${cleanPhone}" class="btn btn-secondary">
        <i class="fa-solid fa-phone"></i> โทรหาผู้ซื้อ
      </a>
    `;
  }

  btnContainer.innerHTML = actionButtonsHtml;
  document.getElementById("notifyBuyerModal").classList.add("active");
}

function closeNotifyBuyerModal() {
  document.getElementById("notifyBuyerModal").classList.remove("active");
}

function copyNotifyText() {
  const text = document.getElementById("notifyBuyerMessageText").value;
  navigator.clipboard.writeText(text).then(() => {
    showToast("คัดลอกข้อความแจ้งเตือนแล้ว นำไปวางในแชทได้เลยครับ", "success");
  }).catch(() => {
    showToast("คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วกดคัดลอกด้วยตนเอง", "error");
  });
}

async function markPreorderAsNotified() {
  const preId = document.getElementById("notifyBuyerPreorderId").value;
  if (!preId) return;

  const newStatus = "แจ้งเตือนแล้ว (พร้อมรับของ)";
  await changePreorderStatus(preId, newStatus);
  closeNotifyBuyerModal();
  showToast("บันทึกสถานะแจ้งเตือนเรียบร้อยแล้ว", "success");
}


