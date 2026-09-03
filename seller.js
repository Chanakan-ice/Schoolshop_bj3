/**
 * ==============================================================================
 * Web App ระบบซื้อของในโรงเรียน (School Shopping Web Application)
 * Seller Admin Logic: seller.js
 * ==============================================================================
 */

let GAS_API_URL = localStorage.getItem("SCHOOLSHOP_API_URL") || "";

// State
let allOrders = [];
let allProducts = [];
let allPreorders = [];
let allMessages = [];

document.addEventListener("DOMContentLoaded", () => {
  const apiInput = document.getElementById("apiUrlInput");
  if (apiInput && GAS_API_URL) {
    apiInput.value = GAS_API_URL;
  }

  checkAdminAuth();
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
    loadProducts(),
    loadPreorders(),
    loadMessages()
  ]);
  updateMetrics();
}

// 1. Orders
async function loadOrders() {
  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=getOrders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allOrders = json.data;
        renderOrdersTable(allOrders);
        return;
      }
    } catch (e) {
      console.warn("GAS Orders fetch failed:", e);
    }
  }

  // Fallback to local storage
  allOrders = JSON.parse(localStorage.getItem("SCHOOLSHOP_ORDERS") || "[]");
  renderOrdersTable(allOrders);
}

function renderOrdersTable(ordersToDisplay) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  if (ordersToDisplay.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีคำสั่งซื้อ</td></tr>`;
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

    return `
      <tr>
        <td><strong>${order.order_id || '-'}</strong></td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${order.timestamp || order.date || '-'}</td>
        <td>
          <div style="font-weight: 600;">${order.student_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ชั้น ${order.student_class}/${order.student_room} เลขที่ ${order.student_no || '-'}
            <br>โทร: <a href="tel:${order.phone}">${order.phone}</a>
          </div>
        </td>
        <td style="max-width: 250px; font-size: 0.85rem;">
          ${itemsText}
          ${order.note ? `<div style="color: var(--text-light); font-style: italic; font-size: 0.75rem;">โน้ต: ${order.note}</div>` : ''}
        </td>
        <td style="font-weight: 700; color: var(--primary);">${Number(order.total_price || 0).toLocaleString()} ฿</td>
        <td style="font-size: 0.85rem;">${order.pickup_location || '-'}</td>
        <td><span class="badge ${badgeClass}">${order.status || 'รอดำเนินการ'}</span></td>
        <td>
          <select class="form-select" style="padding: 0.35rem 0.6rem; font-size: 0.85rem; width: auto;" onchange="changeOrderStatus('${order.order_id}', this.value)">
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

  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "updateOrderStatus",
          order_id: orderId,
          status: newStatus
        })
      });
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
async function loadProducts() {
  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=getProducts`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allProducts = json.data;
        renderProductsTable();
        return;
      }
    } catch (e) {
      console.warn("GAS Products fetch failed:", e);
    }
  }

  allProducts = JSON.parse(localStorage.getItem("SCHOOLSHOP_LOCAL_PRODUCTS") || "[]");
  renderProductsTable();
}

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
  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=getPreorders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allPreorders = json.data;
        renderPreordersTable();
        return;
      }
    } catch (e) {}
  }

  allPreorders = JSON.parse(localStorage.getItem("SCHOOLSHOP_PREORDERS") || "[]");
  renderPreordersTable();
}

function renderPreordersTable() {
  const tbody = document.getElementById("preordersTableBody");
  if (!tbody) return;

  if (allPreorders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">ยังไม่มีรายการสั่งจอง</td></tr>`;
    return;
  }

  tbody.innerHTML = allPreorders.map(pre => `
    <tr>
      <td><strong>${pre.preorder_id || '-'}</strong></td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${pre.timestamp || '-'}</td>
      <td><strong>${pre.student_name}</strong> (ชั้น ${pre.student_class || '-'}/${pre.student_room || '-'})</td>
      <td><a href="tel:${pre.phone}">${pre.phone}</a></td>
      <td style="font-weight: 600; color: var(--primary);">${pre.product_name}</td>
      <td>${pre.quantity}</td>
      <td>${pre.expected_date || '-'}</td>
      <td><span class="badge ${pre.status === 'ส่งมอบแล้ว' ? 'badge-completed' : 'badge-pending'}">${pre.status || 'รอดำเนินการ'}</span></td>
      <td>
        <select class="form-select" style="padding: 0.35rem 0.6rem; font-size: 0.85rem; width: auto;" onchange="changePreorderStatus('${pre.preorder_id}', this.value)">
          <option value="รอดำเนินการ" ${pre.status === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
          <option value="ของมาถึงแล้ว" ${pre.status === 'ของมาถึงแล้ว' ? 'selected' : ''}>ของมาถึงแล้ว</option>
          <option value="ส่งมอบแล้ว" ${pre.status === 'ส่งมอบแล้ว' ? 'selected' : ''}>ส่งมอบแล้ว</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function changePreorderStatus(preorderId, newStatus) {
  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updatePreorderStatus", preorder_id: preorderId, status: newStatus })
      });
    } catch (e) {}
  }

  const found = allPreorders.find(p => String(p.preorder_id) === String(preorderId));
  if (found) {
    found.status = newStatus;
    localStorage.setItem("SCHOOLSHOP_PREORDERS", JSON.stringify(allPreorders));
  }
  renderPreordersTable();
  showToast("อัปเดตสถานะการสั่งจองแล้ว", "success");
}

// 4. Messages
async function loadMessages() {
  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=getMessages`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allMessages = json.data;
        renderMessagesTable();
        return;
      }
    } catch (e) {}
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

// ==================== Product Form (Add / Edit) ====================
function openAddProductModal() {
  document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-box-open"></i> เพิ่มสินค้าใหม่';
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
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
  document.getElementById("prodImgInput").value = prod.image_url || "";
  document.getElementById("prodDescInput").value = prod.description || "";

  document.getElementById("productModal").classList.add("active");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId").value;
  const data = {
    id: id || ("P" + ("000" + (allProducts.length + 1)).slice(-3)),
    name: document.getElementById("prodNameInput").value.trim(),
    category: document.getElementById("prodCatInput").value,
    price: Number(document.getElementById("prodPriceInput").value) || 0,
    stock: Number(document.getElementById("prodStockInput").value) || 0,
    image_url: document.getElementById("prodImgInput").value.trim() || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
    description: document.getElementById("prodDescInput").value.trim()
  };

  showToast("กำลังบันทึกสินค้า...", "info");

  if (GAS_API_URL) {
    try {
      const action = id ? "updateProduct" : "addProduct";
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, ...data })
      });
    } catch (err) {
      console.warn("GAS product save failed:", err);
    }
  }

  // Local Storage update
  if (id) {
    const idx = allProducts.findIndex(p => String(p.id) === String(id));
    if (idx > -1) allProducts[idx] = { ...allProducts[idx], ...data };
  } else {
    allProducts.push(data);
  }
  localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(allProducts));

  closeProductModal();
  renderProductsTable();
  updateMetrics();
  showToast("บันทึกข้อมูลสินค้าเรียบร้อยแล้ว", "success");
}

async function deleteProduct(productId) {
  if (!confirm(`คุณต้องการลบสินค้ารหัส ${productId} ใช่หรือไม่?`)) return;

  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteProduct", id: productId })
      });
    } catch (err) {}
  }

  allProducts = allProducts.filter(p => String(p.id) !== String(productId));
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
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "replyMessage", message_id: msgId, reply: replyText })
      });
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

// ==================== API Settings ====================
function saveApiUrl() {
  const url = document.getElementById("apiUrlInput").value.trim();
  GAS_API_URL = url;
  localStorage.setItem("SCHOOLSHOP_API_URL", url);
  showToast("บันทึก URL สำเร็จแล้ว", "success");
  refreshAllData();
}

async function testApiConnection() {
  const url = document.getElementById("apiUrlInput").value.trim();
  if (!url) {
    showToast("กรุณาระบุ URL ก่อนทดสอบ", "error");
    return;
  }

  showToast("กำลังทดสอบการเชื่อมต่อ...", "info");
  try {
    const res = await fetch(`${url}?action=getProducts`);
    const json = await res.json();
    if (json.success) {
      showToast("🎉 เชื่อมต่อ Google Apps Script API สำเร็จ!", "success");
    } else {
      showToast("ตอบกลับจาก API แต่ success = false", "error");
    }
  } catch (err) {
    console.error("Test connection error:", err);
    showToast("❌ ไม่สามารถเชื่อมต่อได้ ตรวจสอบสิทธิ์และการ Deploy (เลือก Anyone)", "error");
  }
}

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
  const isAuth = sessionStorage.getItem("CAREER_ADMIN_AUTH") === "true";
  const authModal = document.getElementById("adminAuthModal");
  if (!isAuth) {
    if (authModal) authModal.classList.add("active");
  } else {
    if (authModal) authModal.classList.remove("active");
    refreshAllData();
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const input = document.getElementById("adminPasswordInput");
  const errorEl = document.getElementById("authErrorMsg");
  const currentPassword = localStorage.getItem("CAREER_ADMIN_PASSWORD") || "admin1234";

  if (input.value === currentPassword) {
    sessionStorage.setItem("CAREER_ADMIN_AUTH", "true");
    document.getElementById("adminAuthModal").classList.remove("active");
    if (errorEl) errorEl.style.display = "none";
    showToast("เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ", "success");
    refreshAllData();
  } else {
    if (errorEl) errorEl.style.display = "block";
    input.value = "";
    input.focus();
    showToast("รหัสผ่านไม่ถูกต้อง", "error");
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("CAREER_ADMIN_AUTH");
  showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
  window.location.href = "index.html";
}

function changeAdminPassword() {
  const newPass = document.getElementById("newAdminPasswordInput").value.trim();
  const confirmPass = document.getElementById("confirmAdminPasswordInput").value.trim();

  if (!newPass) {
    showToast("กรุณากรอกรหัสผ่านใหม่", "error");
    return;
  }
  if (newPass.length < 4) {
    showToast("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร", "error");
    return;
  }
  if (newPass !== confirmPass) {
    showToast("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน", "error");
    return;
  }

  localStorage.setItem("CAREER_ADMIN_PASSWORD", newPass);
  document.getElementById("newAdminPasswordInput").value = "";
  document.getElementById("confirmAdminPasswordInput").value = "";
  showToast("เปลี่ยนรหัสผ่านแอดมินสำเร็จแล้ว", "success");
}

