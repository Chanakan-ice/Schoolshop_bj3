/**
 * ==============================================================================
 * Web App ระบบซื้อของในโรงเรียน (School Shopping Web Application)
 * Seller Admin Logic: seller.js
 * ==============================================================================
 */

var GAS_API_URL = window.GAS_API_URL || localStorage.getItem("SCHOOLSHOP_API_URL") || "";
window.GAS_API_URL = GAS_API_URL;

// State
var allOrders = window.allOrders || [];
var allProducts = window.allProducts || [];
var allPreorders = window.allPreorders || [];
var allMessages = window.allMessages || [];

document.addEventListener("DOMContentLoaded", () => {
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
    emailInput.value = localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || "";
  }

  // ตรวจสอบ Auth เฉพาะเมื่อเปิดไฟล์ seller.html โดยตรงเท่านั้น (ไม่เปิดค้างบน index.html)
  if (window.location.pathname.endsWith("seller.html") || window.location.search.includes("view=seller")) {
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
        updatePreorderBadge();
        return;
      }
    } catch (e) {}
  }

  allPreorders = JSON.parse(localStorage.getItem("SCHOOLSHOP_PREORDERS") || "[]");
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

  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "setPreorderDeliveryDate",
          preorder_id: preorderId,
          delivery_date: dateVal,
          status: newStatus
        })
      });
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
  updatePreorderBadge();
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
  const isAuth = sessionStorage.getItem("IS_SELLER_LOGGED_IN") === "true" || sessionStorage.getItem("CAREER_ADMIN_AUTH") === "true";
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
  if (typeof showBuyerView === "function") {
    showBuyerView();
  } else {
    window.location.href = "index.html";
  }
}
window.closeAdminAuthModal = closeAdminAuthModal;

function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("adminPasswordInput");
  const errorEl = document.getElementById("authErrorMsg");
  const card = document.getElementById("adminAuthCard");
  const enteredPass = input ? input.value : "";
  const currentPassword = localStorage.getItem("SCHOOLSHOP_ADMIN_PASS") || localStorage.getItem("CAREER_ADMIN_PASSWORD") || "admin1234";

  if (enteredPass === currentPassword) {
    sessionStorage.setItem("IS_SELLER_LOGGED_IN", "true");
    sessionStorage.setItem("CAREER_ADMIN_AUTH", "true");
    const modal = document.getElementById("adminAuthModal");
    if (modal) modal.classList.remove("active");
    if (errorEl) errorEl.style.display = "none";
    if (input) input.value = "";
    showToast("เข้าสู่ระบบแดชบอร์ดผู้ขายสำเร็จ", "success");
    if (typeof showSellerView === "function") {
      showSellerView();
    }
    refreshAllData();
  } else {
    // รหัสผ่านไม่ถูกต้อง -> "ถ้ากดเข้าหน้าแอดมินแต่กรอกรหัสไม่ได้ก้ให้เด้งมาหน้าผู้ซื้อเหมือนเดิม"
    if (errorEl) errorEl.style.display = "block";
    if (card) {
      card.classList.add("shake-anim");
      setTimeout(() => card.classList.remove("shake-anim"), 450);
    }
    showToast("รหัสผ่านไม่ถูกต้อง! กำลังนำท่านกลับสู่หน้าร้านค้าผู้ซื้อ...", "error");

    setTimeout(() => {
      const modal = document.getElementById("adminAuthModal");
      if (modal) modal.classList.remove("active");
      if (input) input.value = "";
      if (errorEl) errorEl.style.display = "none";
      if (typeof showBuyerView === "function") {
        showBuyerView();
      } else {
        window.location.href = "index.html";
      }
    }, 1100);
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
  sessionStorage.removeItem("CAREER_ADMIN_AUTH");
  showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
  if (typeof showBuyerView === "function") {
    showBuyerView();
  } else {
    window.location.href = "index.html";
  }
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

  localStorage.setItem("SCHOOLSHOP_ADMIN_PASS", newPass);
  localStorage.setItem("CAREER_ADMIN_PASSWORD", newPass);
  document.getElementById("newAdminPasswordInput").value = "";
  document.getElementById("confirmAdminPasswordInput").value = "";
  showToast("เปลี่ยนรหัสผ่านแอดมินสำเร็จแล้ว", "success");
}

function saveEmailSettings() {
  const input = document.getElementById("adminEmailsInput");
  const emails = input ? input.value.trim() : "";

  localStorage.setItem("SCHOOLSHOP_ADMIN_EMAILS", emails);

  if (GAS_API_URL && emails) {
    fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveEmailSettings",
        emails: emails
      })
    }).then(res => res.json()).then(json => {
      if (json.success) {
        showToast("บันทึกอีเมลผู้รับแจ้งเตือนไปยังเซิร์ฟเวอร์เรียบร้อยแล้ว", "success");
      }
    }).catch(e => console.warn("Sync email settings err:", e));
  }

  showToast("บันทึกการตั้งค่าอีเมลแจ้งเตือนเรียบร้อยแล้ว", "success");
}

async function testEmailNotification() {
  const input = document.getElementById("adminEmailsInput");
  const emails = input ? input.value.trim() : (localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || "");

  if (!emails) {
    showToast("กรุณาระบุที่อยู่อีเมลของคุณครูก่อนกดทดสอบครับ", "error");
    return;
  }

  showToast("กำลังส่งอีเมลทดสอบ...", "info");

  if (GAS_API_URL) {
    try {
      const res = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "testEmail",
          emails: emails
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.message}`, "success");
        return;
      } else {
        showToast(`⚠️ ${json.message || 'ส่งอีเมลทดสอบล้มเหลว'}`, "error");
        return;
      }
    } catch (e) {
      console.warn("Test email error:", e);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
      return;
    }
  }

  showToast("บันทึกอีเมลเรียบร้อยแล้ว (จะส่งผ่าน GAS เมื่อเชื่อมต่อ Web App URL)", "info");
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


