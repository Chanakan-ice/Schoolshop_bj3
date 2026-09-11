/**
 * ==============================================================================
 * Web App ระบบซื้อของในโรงเรียน (School Shopping Web Application)
 * Buyer Logic: app.js
 * ==============================================================================
 */

// URL สำหรับเชื่อมต่อ Google Apps Script Web API (ผูกกับ Google Sheets อัตโนมัติ)
var DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxMhd31R5kY5n1MXObzkc0UFqE0uaxgb07zOxwRufEbppj0ThoWKWJACFP8tMWEabH7/exec";
var DEFAULT_ADMIN_EMAIL = "schoolshop.bj3@gmail.com";

function getActiveApiUrl() {
  let url = (localStorage.getItem("SCHOOLSHOP_API_URL") || window.GAS_API_URL || DEFAULT_GAS_URL || "").trim();
  if (!url || !url.startsWith("https://script.google.com/macros/s/") || url.includes("AKfycbx5DWkrqm6WftyQdY2JxDJPQm6os7qoEeniPjrb4iZjOSDNfqiyQckac79Jl7X6lo3OKw")) {
    url = DEFAULT_GAS_URL;
    localStorage.setItem("SCHOOLSHOP_API_URL", DEFAULT_GAS_URL);
  }
  return url;
}

var GAS_API_URL = getActiveApiUrl();
window.GAS_API_URL = GAS_API_URL;

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

// App State
let products = [];
let cart = JSON.parse(localStorage.getItem("SCHOOLSHOP_CART")) || [];
let selectedCategory = "all";
let searchQuery = "";
let pendingCheckoutItems = null;
let isBuyNowFlow = false;
let activeCheckoutItems = null;
let regSelectedRole = "student";

// ==================== Initialization ====================
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  loadProducts();
  updateCartBadge();
  initCustomerAuth();
  handleUrlHash();
});

function initEventListeners() {
  // Category filter clicks
  const catButtons = document.querySelectorAll(".cat-pill");
  catButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      catButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCategory = btn.getAttribute("data-cat");
      renderProducts();
    });
  });

  // Search input typing
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Close customer dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("customerNavWrap");
    const menu = document.getElementById("accountDropdownMenu");
    if (wrap && menu && !wrap.contains(e.target)) {
      menu.classList.remove("show");
    }
  });

  // Listen for browser back/forward navigation between product detail and shop listing
  window.addEventListener("hashchange", handleUrlHash);
  window.addEventListener("popstate", handleUrlHash);
}

// ==================== Fetch Products ====================
async function loadProducts() {
  const countEl = document.getElementById("productCount");
  if (countEl) countEl.innerText = "กำลังโหลดข้อมูล...";

  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=getProducts`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        products = json.data;
        renderProducts();
        return;
      }
    } catch (err) {
      console.warn("ไม่สามารถดึงข้อมูลจาก GAS API ได้ ใช้ข้อมูลในเครื่องแทน:", err);
    }
  }

  // Fallback to local / mock products (ตรวจเช็กและอัปเดตหากเป็นข้อมูลสหกรณ์แบบเดิม)
  const localSavedProducts = localStorage.getItem("SCHOOLSHOP_LOCAL_PRODUCTS");
  if (localSavedProducts) {
    const parsed = JSON.parse(localSavedProducts);
    // หากพบหมวดหมู่เดิม ให้รีเฟรชเป็นหมวดการงานอาชีพ
    const hasOldCategories = parsed.some(p => p.category === "สมุด/เครื่องเขียน" || p.category === "ของว่าง/เครื่องดื่ม");
    if (hasOldCategories) {
      products = DEFAULT_PRODUCTS;
      localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(products));
    } else {
      products = parsed;
    }
  } else {
    products = DEFAULT_PRODUCTS;
    localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(products));
  }

  renderProducts();
}

// ==================== Render Products Grid ====================
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const countEl = document.getElementById("productCount");
  if (!grid) return;

  const filtered = products.filter(item => {
    const matchCategory = (selectedCategory === "all" || item.category === selectedCategory);
    const matchSearch = (
      item.name.toLowerCase().includes(searchQuery) ||
      (item.description && item.description.toLowerCase().includes(searchQuery))
    );
    return matchCategory && matchSearch;
  });

  if (countEl) {
    countEl.innerText = `พบ ${filtered.length} รายการ`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
        <h3 style="color: var(--text-muted);">ไม่พบสินค้าที่ตรงกับเงื่อนไข</h3>
        <p style="font-size: 0.9rem; color: var(--text-light);">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่นดูนะครับ</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const stock = Number(item.stock) || 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;

    return `
      <div class="product-card" onclick="viewProductDetail('${item.id}')" style="cursor: pointer;" title="คลิกเพื่อดูรายละเอียดและสั่งซื้อ">
        <div class="product-image-wrap">
          <img src="${item.image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'}" alt="${item.name}" class="product-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'">
          <span class="product-badge">${item.category || 'ทั่วไป'}</span>
        </div>
        <div class="product-body">
          <h3 class="product-title">${item.name}</h3>
          <p class="product-desc">${item.description || '-'}</p>
          
          <div class="product-footer">
            <div>
              <div class="product-price">${Number(item.price).toLocaleString()} <span>฿</span></div>
              <div class="stock-tag ${isLowStock ? 'low' : ''}">
                ${isOutOfStock ? '<span style="color: #d97706; font-weight: 600;"><i class="fa-solid fa-clock"></i> สินค้าหมด (เปิดรับจอง)</span>' : `คงเหลือ: ${stock} ชิ้น`}
              </div>
            </div>
            
            ${isOutOfStock ? `
              <button class="add-cart-btn preorder-card-btn" onclick="event.stopPropagation(); openPreorderForProduct('${encodeURIComponent(item.name)}')">
                <i class="fa-solid fa-calendar-plus"></i> สั่งจองสินค้า
              </button>
            ` : `
              <button class="add-cart-btn" onclick="event.stopPropagation(); addToCart('${item.id}')">
                <i class="fa-solid fa-cart-plus"></i> ใส่ตะกร้า
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== Product Detail View (หน้ารายละเอียดสินค้า & สั่งซื้อทันที) ====================
function viewProductDetail(productId, pushHistory = true) {
  const prod = products.find(p => String(p.id) === String(productId));
  if (!prod) return;

  const mainShop = document.getElementById("mainShopView");
  const detailView = document.getElementById("productDetailView");
  const detailContainer = document.getElementById("productDetailContainer");
  if (!detailView || !detailContainer) return;

  if (mainShop) mainShop.style.display = "none";
  detailView.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pushHistory) {
    window.location.hash = "product-" + productId;
  }

  const stock = Number(prod.stock) || 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const stockClass = isOutOfStock ? "out" : (isLowStock ? "low" : "in");
  const stockText = isOutOfStock
    ? '<i class="fa-solid fa-clock"></i> สินค้าหมดชั่วคราว (เปิดรับจองล่วงหน้า)'
    : (isLowStock ? `<i class="fa-solid fa-triangle-exclamation"></i> ใกล้หมด เหลือเพียง ${stock} ชิ้น` : `<i class="fa-solid fa-boxes-stacked"></i> สต็อกพร้อมส่ง: ${stock} ชิ้น`);

  detailContainer.innerHTML = `
    <button class="btn btn-secondary detail-back-btn" onclick="closeProductDetail()">
      <i class="fa-solid fa-arrow-left"></i> กลับหน้ารายการสินค้า
    </button>

    <div class="product-detail-grid">
      <!-- Media Side -->
      <div class="product-detail-media">
        <img src="${prod.image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'}" 
             alt="${prod.name}" 
             class="detail-main-img" 
             onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'">
      </div>

      <!-- Info Side -->
      <div class="product-detail-info">
        <div class="detail-badge-row">
          <span class="product-badge" style="position: static; font-size: 0.85rem; padding: 0.35rem 0.85rem;">
            <i class="fa-solid fa-tag"></i> ${prod.category || 'ทั่วไป'}
          </span>
          <span class="detail-stock-badge ${stockClass}">
            ${stockText}
          </span>
        </div>

        <h1 class="detail-title">${prod.name}</h1>

        <div class="detail-price-box">
          <div class="detail-price-num">${Number(prod.price).toLocaleString()} <span class="detail-currency">฿</span></div>
          <div class="detail-cod-note"><i class="fa-solid fa-hand-holding-dollar"></i> ชำระเงินปลายทาง (Cash on Delivery) เมื่อรับสินค้า</div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title"><i class="fa-solid fa-circle-info"></i> รายละเอียดสินค้า & ผลงาน</div>
          <div class="detail-desc">${prod.description ? prod.description.replace(/\n/g, '<br>') : 'ไม่มีรายละเอียดเพิ่มเติม'}</div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title"><i class="fa-solid fa-location-dot"></i> การรับสินค้า & ชำระเงิน</div>
          <div class="detail-pickup-info">
            <i class="fa-solid fa-school" style="color: var(--primary);"></i> 
            นัดรับสินค้าได้ที่ <strong>ห้องพักครูหมวดการงานอาชีพ</strong> หรือระบุห้องเรียน/อาคารที่สะดวก พร้อมชำระเงินสดตอนรับสินค้า
          </div>
        </div>

        ${stock > 0 ? `
          <!-- Quantity Selector -->
          <div class="detail-qty-row">
            <label class="detail-qty-label">จำนวนที่ต้องการสั่งซื้อ:</label>
            <div class="qty-counter">
              <button type="button" class="qty-counter-btn" onclick="changeDetailQty(-1, ${stock})">-</button>
              <input type="number" id="detailQtyInput" class="qty-counter-input" value="1" min="1" max="${stock}" readonly>
              <button type="button" class="qty-counter-btn" onclick="changeDetailQty(1, ${stock})">+</button>
            </div>
            <span style="font-size: 0.85rem; color: var(--text-muted);">(มีจำหน่าย ${stock} ชิ้น)</span>
          </div>

          <!-- Action Buttons: Buy Now & Add to Cart -->
          <div class="detail-actions-row">
            <button type="button" class="btn-buy-now" onclick="buyNowCurrentProduct('${prod.id}')">
              <i class="fa-solid fa-bolt"></i> สั่งซื้อทันที (COD)
            </button>
            <button type="button" class="btn-add-cart-detail" onclick="addCurrentProductToCart('${prod.id}')">
              <i class="fa-solid fa-cart-plus"></i> เพิ่มลงตะกร้า
            </button>
          </div>
        ` : `
          <div class="detail-actions-row">
            <button type="button" class="btn-buy-now" style="background: linear-gradient(135deg, #d97706, #b45309);" onclick="openPreorderForProduct('${encodeURIComponent(prod.name)}')">
              <i class="fa-solid fa-calendar-plus"></i> สินค้าหมดชั่วคราว - กดสั่งจองล่วงหน้า
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

function closeProductDetail(cleanHash = true) {
  const mainShop = document.getElementById("mainShopView");
  const detailView = document.getElementById("productDetailView");
  if (detailView) detailView.style.display = "none";
  if (mainShop) mainShop.style.display = "block";

  if (cleanHash && window.location.hash.startsWith("#product-")) {
    history.pushState(null, "", window.location.pathname + window.location.search);
  }
}

function changeDetailQty(delta, maxStock) {
  const input = document.getElementById("detailQtyInput");
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val += delta;
  if (val < 1) val = 1;
  if (val > maxStock) val = maxStock;
  input.value = val;
}

function addCurrentProductToCart(productId) {
  const prod = products.find(p => String(p.id) === String(productId));
  if (!prod) return;

  const qtyInput = document.getElementById("detailQtyInput");
  const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
  const currentStock = Number(prod.stock) || 0;

  const existingIndex = cart.findIndex(c => String(c.id) === String(productId));
  if (existingIndex > -1) {
    if (cart[existingIndex].quantity + qty > currentStock) {
      showToast(`สินค้า ${prod.name} ในสต็อกมีเพียง ${currentStock} ชิ้น`, "error");
      return;
    }
    cart[existingIndex].quantity += qty;
  } else {
    if (currentStock < qty) {
      showToast("สินค้าในสต็อกไม่เพียงพอ", "error");
      return;
    }
    cart.push({
      id: prod.id,
      name: prod.name,
      price: Number(prod.price),
      quantity: qty,
      image_url: prod.image_url
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`เพิ่ม "${prod.name}" (${qty} ชิ้น) ลงในตะกร้าแล้ว`, "success");
}

function buyNowCurrentProduct(productId) {
  const prod = products.find(p => String(p.id) === String(productId));
  if (!prod) return;

  const qtyInput = document.getElementById("detailQtyInput");
  const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;

  if ((Number(prod.stock) || 0) < qty) {
    showToast("สินค้าในสต็อกไม่เพียงพอ", "error");
    return;
  }

  const buyNowItem = [{
    id: prod.id,
    name: prod.name,
    price: Number(prod.price),
    quantity: qty,
    image_url: prod.image_url
  }];

  const current = getCurrentCustomer();
  if (!current) {
    pendingCheckoutItems = buyNowItem;
    isBuyNowFlow = true;
    showToast("กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อทำการสั่งซื้อครับ", "info");
    openCustomerAuthModal('login');
    return;
  }

  isBuyNowFlow = true;
  openCheckoutModal(buyNowItem);
}

function handleUrlHash() {
  const hash = window.location.hash || "";
  if (hash.startsWith("#product-")) {
    const pId = hash.replace("#product-", "");
    viewProductDetail(pId, false);
  } else {
    closeProductDetail(false);
  }
}

// ==================== Customer Account System (ระบบบัญชีลูกค้า & สลับบัญชี) ====================
function getSavedAccounts() {
  try {
    return JSON.parse(localStorage.getItem("SCHOOLSHOP_CUSTOMER_ACCOUNTS") || "[]");
  } catch (e) {
    return [];
  }
}

function saveSavedAccounts(list) {
  localStorage.setItem("SCHOOLSHOP_CUSTOMER_ACCOUNTS", JSON.stringify(list));
  updateCustomerUI();
}

function getCurrentCustomer() {
  try {
    return JSON.parse(localStorage.getItem("SCHOOLSHOP_CURRENT_CUSTOMER") || "null");
  } catch (e) {
    return null;
  }
}

function setCurrentCustomer(user) {
  if (user) {
    localStorage.setItem("SCHOOLSHOP_CURRENT_CUSTOMER", JSON.stringify(user));
  } else {
    localStorage.removeItem("SCHOOLSHOP_CURRENT_CUSTOMER");
  }
  updateCustomerUI();
}

function initCustomerAuth() {
  updateCustomerUI();
}

function updateCustomerUI() {
  const current = getCurrentCustomer();
  const accounts = getSavedAccounts();

  const nameEl = document.getElementById("customerNavName");
  const avatarEl = document.getElementById("customerAvatarIcon");
  const countEl = document.getElementById("dropdownAccountCount");
  const savedCountEl = document.getElementById("savedAccountsCount");
  const userHeader = document.getElementById("dropdownUserHeader");
  const userName = document.getElementById("dropdownUserName");
  const userEmail = document.getElementById("dropdownUserEmail");
  const loginBtn = document.getElementById("dropdownLoginBtn");
  const logoutBtn = document.getElementById("dropdownLogoutBtn");
  const logoutDiv = document.getElementById("dropdownLogoutDivider");

  if (countEl) countEl.innerText = accounts.length;
  if (savedCountEl) savedCountEl.innerText = accounts.length;

  if (current) {
    if (nameEl) nameEl.innerText = current.name || current.email.split("@")[0];
    if (avatarEl) {
      avatarEl.innerHTML = current.buyer_type === "teacher" 
        ? '<i class="fa-solid fa-chalkboard-user"></i>' 
        : '<i class="fa-solid fa-graduation-cap"></i>';
    }
    if (userHeader) userHeader.style.display = "block";
    if (userName) userName.innerText = current.name || "-";
    if (userEmail) userEmail.innerText = current.email + (current.buyer_type === "teacher" ? " (คุณครู)" : ` (ห้อง ${current.student_room || '-'})`);
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "flex";
    if (logoutDiv) logoutDiv.style.display = "block";
  } else {
    if (nameEl) nameEl.innerText = "เข้าสู่ระบบ";
    if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
    if (userHeader) userHeader.style.display = "none";
    if (loginBtn) loginBtn.style.display = "flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (logoutDiv) logoutDiv.style.display = "none";
  }
}

function toggleCustomerDropdown() {
  const menu = document.getElementById("accountDropdownMenu");
  if (!menu) return;
  menu.classList.toggle("show");
  updateCustomerUI();
}

function openCustomerAuthModal(tab = "login") {
  const menu = document.getElementById("accountDropdownMenu");
  if (menu) menu.classList.remove("show");

  const modal = document.getElementById("customerAuthModal");
  if (!modal) return;

  switchCustomerAuthTab(tab);
  modal.classList.add("active");
}

function closeCustomerAuthModal() {
  const modal = document.getElementById("customerAuthModal");
  if (modal) modal.classList.remove("active");
  const logErr = document.getElementById("loginAuthError");
  const regErr = document.getElementById("regAuthError");
  if (logErr) logErr.style.display = "none";
  if (regErr) regErr.style.display = "none";
}

function switchCustomerAuthTab(tab) {
  const tabLogin = document.getElementById("tabAuthLogin");
  const tabReg = document.getElementById("tabAuthRegister");
  const tabSwitch = document.getElementById("tabAuthSwitch");
  const formLogin = document.getElementById("customerLoginForm");
  const formReg = document.getElementById("customerRegisterForm");
  const viewSwitch = document.getElementById("customerSwitchView");

  if (!tabLogin || !tabReg || !tabSwitch) return;

  tabLogin.classList.remove("active");
  tabReg.classList.remove("active");
  tabSwitch.classList.remove("active");

  if (formLogin) formLogin.style.display = "none";
  if (formReg) formReg.style.display = "none";
  if (viewSwitch) viewSwitch.style.display = "none";

  if (tab === "register") {
    tabReg.classList.add("active");
    if (formReg) formReg.style.display = "block";
  } else if (tab === "switch") {
    tabSwitch.classList.add("active");
    if (viewSwitch) viewSwitch.style.display = "block";
    renderSavedAccountsList();
  } else {
    tabLogin.classList.add("active");
    if (formLogin) formLogin.style.display = "block";
  }
}

function selectRegRole(role) {
  regSelectedRole = role;
  const btnStudent = document.getElementById("regRoleStudent");
  const btnTeacher = document.getElementById("regRoleTeacher");
  const studentFields = document.getElementById("regStudentFields");
  const teacherFields = document.getElementById("regTeacherFields");

  if (role === "teacher") {
    if (btnTeacher) btnTeacher.classList.add("active");
    if (btnStudent) btnStudent.classList.remove("active");
    if (studentFields) studentFields.style.display = "none";
    if (teacherFields) teacherFields.style.display = "block";
  } else {
    if (btnStudent) btnStudent.classList.add("active");
    if (btnTeacher) btnTeacher.classList.remove("active");
    if (studentFields) studentFields.style.display = "block";
    if (teacherFields) teacherFields.style.display = "none";
  }
}

function handleCustomerLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("loginCustomerEmail");
  const passInput = document.getElementById("loginCustomerPassword");
  const errEl = document.getElementById("loginAuthError");

  const email = (emailInput ? emailInput.value : "").trim().toLowerCase();
  const password = passInput ? passInput.value : "";

  if (!email || !password) {
    if (errEl) {
      errEl.innerText = "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน";
      errEl.style.display = "block";
    }
    return;
  }

  const accounts = getSavedAccounts();
  const found = accounts.find(a => a.email.toLowerCase() === email);

  if (!found) {
    if (errEl) {
      errEl.innerHTML = `ยังไม่พบบัญชีอีเมลนี้ในอุปกรณ์ <a href="javascript:void(0)" onclick="switchCustomerAuthTab('register')" style="color: var(--primary); text-decoration: underline; font-weight: 600;">คลิกที่นี่เพื่อสมัครสมาชิกใหม่</a>`;
      errEl.style.display = "block";
    }
    return;
  }

  if (found.password && found.password !== password) {
    if (errEl) {
      errEl.innerText = "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
      errEl.style.display = "block";
    }
    return;
  }

  // เข้าสู่ระบบสำเร็จ
  if (errEl) errEl.style.display = "none";
  setCurrentCustomer(found);
  closeCustomerAuthModal();
  showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${found.name}`, "success");

  checkPendingOrderAction();
}

function handleCustomerRegisterSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("regCustomerEmail");
  const passInput = document.getElementById("regCustomerPassword");
  const nameInput = document.getElementById("regCustomerName");
  const phoneInput = document.getElementById("regCustomerPhone");
  const pickupInput = document.getElementById("regCustomerPickup");
  const errEl = document.getElementById("regAuthError");

  const email = (emailInput ? emailInput.value : "").trim().toLowerCase();
  const password = passInput ? passInput.value : "";
  const name = (nameInput ? nameInput.value : "").trim();
  const phone = (phoneInput ? phoneInput.value : "").trim();
  const pickup = (pickupInput ? pickupInput.value : "").trim();

  if (!email || !password || !name || !phone) {
    if (errEl) {
      errEl.innerText = "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน";
      errEl.style.display = "block";
    }
    return;
  }

  if (password.length < 4) {
    if (errEl) {
      errEl.innerText = "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร";
      errEl.style.display = "block";
    }
    return;
  }

  const accounts = getSavedAccounts();
  const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === email);

  const newAccount = {
    id: "CUST-" + Date.now().toString().slice(-6),
    email: email,
    password: password,
    name: name,
    buyer_type: regSelectedRole,
    phone: phone,
    pickup_location: pickup || (regSelectedRole === "teacher" ? "ห้องพักครูกลุ่มสาระการงานอาชีพ" : "หมวดการงานอาชีพ (ห้องพักครูหมวดการงานอาชีพ)"),
    student_room: regSelectedRole === "student" ? ((document.getElementById("regStudentRoom") && document.getElementById("regStudentRoom").value.trim()) || "") : "",
    student_no: regSelectedRole === "student" ? ((document.getElementById("regStudentNo") && document.getElementById("regStudentNo").value.trim()) || "") : "",
    department: regSelectedRole === "teacher" ? ((document.getElementById("regTeacherDept") && document.getElementById("regTeacherDept").value) || "กลุ่มสาระการเรียนรู้การงานอาชีพ") : "",
    created_at: new Date().toISOString()
  };

  if (existingIdx > -1) {
    // อัปเดตข้อมูลบัญชีเดิม
    accounts[existingIdx] = newAccount;
  } else {
    // เพิ่มบัญชีใหม่ (รองรับ 1 คนหลายบัญชีในเครื่องเดียวกัน)
    accounts.push(newAccount);
  }

  saveSavedAccounts(accounts);
  setCurrentCustomer(newAccount);
  closeCustomerAuthModal();
  showToast(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${newAccount.name}`, "success");

  checkPendingOrderAction();
}

function renderSavedAccountsList() {
  const container = document.getElementById("savedAccountsList");
  if (!container) return;
  const accounts = getSavedAccounts();
  const current = getCurrentCustomer();

  if (accounts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.9rem;">
        <i class="fa-solid fa-users" style="font-size: 2.25rem; color: var(--text-light); margin-bottom: 0.75rem;"></i>
        <div style="font-weight: 500;">ยังไม่มีบัญชีที่บันทึกไว้บนอุปกรณ์นี้</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">คุณสามารถสมัครบัญชีใหม่และสลับใช้งานได้ไม่จำกัด</div>
      </div>
    `;
    return;
  }

  container.innerHTML = accounts.map(acc => {
    const isCurrent = current && (current.id === acc.id || current.email === acc.email);
    const roleIcon = acc.buyer_type === "teacher" ? "fa-chalkboard-user" : "fa-graduation-cap";
    const roleLabel = acc.buyer_type === "teacher" 
      ? (acc.department || "คุณครู/บุคลากร") 
      : `ห้อง ${acc.student_room || '-'} เลขที่ ${acc.student_no || '-'}`;

    return `
      <div class="account-card-item ${isCurrent ? 'active-account' : ''}" onclick="switchCustomerAccount('${acc.id}')">
        <div class="account-card-avatar">
          <i class="fa-solid ${roleIcon}"></i>
        </div>
        <div class="account-card-info">
          <div class="account-card-name">
            ${acc.name} ${isCurrent ? '<span class="account-current-tag"><i class="fa-solid fa-circle-check"></i> กำลังใช้งาน</span>' : ''}
          </div>
          <div class="account-card-email">${acc.email} • ${roleLabel}</div>
        </div>
        <div class="account-card-actions">
          <button type="button" class="account-del-btn" onclick="removeSavedAccount('${acc.id}', event)" title="ลบบัญชีนี้ออกจากเครื่อง">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function switchCustomerAccount(accountId) {
  const accounts = getSavedAccounts();
  const target = accounts.find(a => a.id === accountId);
  if (!target) return;

  setCurrentCustomer(target);
  closeCustomerAuthModal();
  showToast(`สลับใช้งานเป็นบัญชี: ${target.name}`, "success");
  checkPendingOrderAction();
}

function removeSavedAccount(accountId, event) {
  if (event) event.stopPropagation();
  if (!confirm("คุณต้องการลบบัญชีนี้ออกจากอุปกรณ์นี้ใช่หรือไม่?")) return;

  let accounts = getSavedAccounts();
  accounts = accounts.filter(a => a.id !== accountId);
  saveSavedAccounts(accounts);

  const current = getCurrentCustomer();
  if (current && current.id === accountId) {
    if (accounts.length > 0) {
      setCurrentCustomer(accounts[0]);
    } else {
      setCurrentCustomer(null);
    }
  }

  renderSavedAccountsList();
  showToast("ลบบัญชีออกจากเครื่องแล้ว", "info");
}

function logoutCustomer() {
  setCurrentCustomer(null);
  const menu = document.getElementById("accountDropdownMenu");
  if (menu) menu.classList.remove("show");
  showToast("ออกจากระบบผู้ซื้อแล้ว", "info");
}

function autoFillCustomerData() {
  const customer = getCurrentCustomer();
  if (!customer) return;

  const nameInput = document.getElementById("custName");
  const phoneInput = document.getElementById("custPhone");
  if (nameInput) nameInput.value = customer.name || "";
  if (phoneInput) phoneInput.value = customer.phone || "";

  if (customer.buyer_type === "teacher") {
    switchBuyerType("teacher");
    const deptSelect = document.getElementById("teacherDept");
    if (deptSelect && customer.department) {
      deptSelect.value = customer.department;
      syncTeacherLocation(customer.department, false);
    }
    const locSelect = document.getElementById("teacherLocationSelect");
    if (locSelect && customer.pickup_location) {
      locSelect.value = customer.pickup_location;
    }
  } else {
    switchBuyerType("student");
    const roomInput = document.getElementById("custRoom");
    const noInput = document.getElementById("custNo");
    const locInput = document.getElementById("custLocationStudent");
    if (roomInput) roomInput.value = customer.student_room || "";
    if (noInput) noInput.value = customer.student_no || "";
    if (locInput && customer.pickup_location) {
      locInput.value = customer.pickup_location;
    }
  }
}

function autoFillPreorderCustomerData() {
  const customer = getCurrentCustomer();
  if (!customer) return;

  const nameInput = document.getElementById("preCustName");
  const phoneInput = document.getElementById("preCustPhone");
  if (nameInput) nameInput.value = customer.name || "";
  if (phoneInput) phoneInput.value = customer.phone || "";

  if (customer.buyer_type === "teacher") {
    switchPreorderBuyerType("teacher");
    const deptSelect = document.getElementById("preTeacherDept");
    if (deptSelect && customer.department) {
      deptSelect.value = customer.department;
      syncTeacherLocation(customer.department, true);
    }
  } else {
    switchPreorderBuyerType("student");
    const roomInput = document.getElementById("preCustRoom");
    const noInput = document.getElementById("preCustNo");
    if (roomInput) roomInput.value = customer.student_room || "";
    if (noInput) noInput.value = customer.student_no || "";
  }
}

function checkPendingOrderAction() {
  if (pendingCheckoutItems && pendingCheckoutItems.length > 0) {
    const items = pendingCheckoutItems;
    pendingCheckoutItems = null;
    openCheckoutModal(items);
  }
}

// ==================== Cart System ====================
function addToCart(productId) {
  const prod = products.find(p => String(p.id) === String(productId));
  if (!prod) return;

  const currentStock = Number(prod.stock) || 0;
  const existingIndex = cart.findIndex(c => String(c.id) === String(productId));

  if (existingIndex > -1) {
    if (cart[existingIndex].quantity >= currentStock) {
      showToast(`สินค้า ${prod.name} ในสต็อกมีเพียง ${currentStock} ชิ้น`, "error");
      return;
    }
    cart[existingIndex].quantity += 1;
  } else {
    if (currentStock <= 0) {
      showToast("สินค้านี้หมดแล้ว", "error");
      return;
    }
    cart.push({
      id: prod.id,
      name: prod.name,
      price: Number(prod.price),
      quantity: 1,
      image_url: prod.image_url
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`เพิ่ม "${prod.name}" ลงในตะกร้าแล้ว`, "success");
}

function updateCartQuantity(productId, delta) {
  const itemIndex = cart.findIndex(c => String(c.id) === String(productId));
  if (itemIndex === -1) return;

  const prod = products.find(p => String(p.id) === String(productId));
  const maxStock = prod ? Number(prod.stock) : 999;

  const newQty = cart[itemIndex].quantity + delta;

  if (newQty <= 0) {
    cart.splice(itemIndex, 1);
  } else if (newQty > maxStock) {
    showToast(`สินค้ามีจำนวนจำกัด (สูงสุด ${maxStock} ชิ้น)`, "error");
    return;
  } else {
    cart[itemIndex].quantity = newQty;
  }

  saveCart();
  updateCartBadge();
  renderCartModal();
}

function saveCart() {
  localStorage.setItem("SCHOOLSHOP_CART", JSON.stringify(cart));
}

function updateCartBadge() {
  const countEl = document.getElementById("cartCount");
  if (!countEl) return;
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  countEl.innerText = totalCount;
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ==================== Cart Modal UI ====================
function openCartModal() {
  renderCartModal();
  document.getElementById("cartModal").classList.add("active");
}

function closeCartModal() {
  document.getElementById("cartModal").classList.remove("active");
}

function renderCartModal() {
  const listEl = document.getElementById("cartItemsList");
  const totalEl = document.getElementById("cartTotalPrice");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fa-solid fa-cart-arrow-down" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 0.5rem;"></i>
        <p>ยังไม่มีสินค้าในตะกร้า</p>
      </div>
    `;
    totalEl.innerText = "0 ฿";
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  listEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${Number(item.price).toLocaleString()} ฿ x ${item.quantity} = <strong>${(item.price * item.quantity).toLocaleString()} ฿</strong></div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
      </div>
      <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; color: var(--danger);" onclick="updateCartQuantity('${item.id}', -999)" title="ลบ">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join("");

  totalEl.innerText = `${calculateCartTotal().toLocaleString()} ฿`;
}

// ==================== Checkout & COD Order Submission ====================
function switchBuyerType(type) {
  const btnStudent = document.getElementById("btnTypeStudent");
  const btnTeacher = document.getElementById("btnTypeTeacher");
  const studentBlock = document.getElementById("studentFieldsBlock");
  const teacherBlock = document.getElementById("teacherFieldsBlock");
  const buyerTypeInput = document.getElementById("custBuyerType");

  if (!btnStudent || !btnTeacher) return;

  if (type === "teacher") {
    btnTeacher.classList.add("active");
    btnStudent.classList.remove("active");
    if (studentBlock) studentBlock.style.display = "none";
    if (teacherBlock) teacherBlock.style.display = "block";
    if (buyerTypeInput) buyerTypeInput.value = "teacher";
  } else {
    btnStudent.classList.add("active");
    btnTeacher.classList.remove("active");
    if (studentBlock) studentBlock.style.display = "block";
    if (teacherBlock) teacherBlock.style.display = "none";
    if (buyerTypeInput) buyerTypeInput.value = "student";
  }
}

function switchPreorderBuyerType(type) {
  const btnStudent = document.getElementById("btnPreTypeStudent");
  const btnTeacher = document.getElementById("btnPreTypeTeacher");
  const studentBlock = document.getElementById("preStudentFieldsBlock");
  const teacherBlock = document.getElementById("preTeacherFieldsBlock");
  const buyerTypeInput = document.getElementById("preBuyerType");

  if (!btnStudent || !btnTeacher) return;

  if (type === "teacher") {
    btnTeacher.classList.add("active");
    btnStudent.classList.remove("active");
    if (studentBlock) studentBlock.style.display = "none";
    if (teacherBlock) teacherBlock.style.display = "block";
    if (buyerTypeInput) buyerTypeInput.value = "teacher";
  } else {
    btnStudent.classList.add("active");
    btnTeacher.classList.remove("active");
    if (studentBlock) studentBlock.style.display = "block";
    if (teacherBlock) teacherBlock.style.display = "none";
    if (buyerTypeInput) buyerTypeInput.value = "student";
  }
}

function syncTeacherLocation(dept, isPreorder = false) {
  const prefix = isPreorder ? "preTeacher" : "teacher";
  const locSelect = document.getElementById(`${prefix}LocationSelect`);
  if (!locSelect) return;

  const map = {
    "กลุ่มสาระการเรียนรู้การงานอาชีพ": "ห้องพักครูกลุ่มสาระการงานอาชีพ",
    "กลุ่มสาระการเรียนรู้ภาษาไทย": "ห้องพักครูกลุ่มสาระภาษาไทย",
    "กลุ่มสาระการเรียนรู้คณิตศาสตร์": "ห้องพักครูกลุ่มสาระคณิตศาสตร์",
    "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี": "ห้องพักครูกลุ่มสาระวิทยาศาสตร์และเทคโนโลยี",
    "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม": "ห้องพักครูกลุ่มสาระสังคมศึกษาฯ",
    "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา": "ห้องพักครูกลุ่มสาระสุขศึกษาและพลศึกษา",
    "กลุ่มสาระการเรียนรู้ศิลปะ": "ห้องพักครูกลุ่มสาระศิลปะ",
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ": "ห้องพักครูกลุ่มสาระภาษาต่างประเทศ",
    "กิจกรรมพัฒนาผู้เรียน / แนะแนว": "ห้องพักครูแนะแนว / กิจกรรมพัฒนาผู้เรียน",
    "ฝ่ายบริหาร / บุคลากรทั่วไป": "ห้องสำนักงาน / ฝ่ายบริหาร"
  };

  if (map[dept]) {
    locSelect.value = map[dept];
  }
}

function openCheckoutModal(customItems = null) {
  if (customItems && Array.isArray(customItems) && customItems.length > 0) {
    activeCheckoutItems = customItems;
    isBuyNowFlow = true;
  } else {
    if (cart.length === 0) {
      showToast("กรุณาเลือกสินค้าลงในตะกร้าก่อนครับ", "error");
      return;
    }
    activeCheckoutItems = [...cart];
    isBuyNowFlow = false;
  }

  // Check if customer is logged in
  const current = getCurrentCustomer();
  if (!current) {
    showToast("กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนทำการสั่งซื้อครับ", "info");
    pendingCheckoutItems = activeCheckoutItems;
    openCustomerAuthModal('login');
    return;
  }

  closeCartModal();
  autoFillCustomerData();
  document.getElementById("checkoutModal").classList.add("active");
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").classList.remove("active");
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกคำสั่งซื้อ...';

  const buyerType = (document.getElementById("custBuyerType") && document.getElementById("custBuyerType").value) || "student";
  const isTeacher = buyerType === "teacher";
  const name = (document.getElementById("custName") ? document.getElementById("custName").value : "").trim();
  const phone = (document.getElementById("custPhone") ? document.getElementById("custPhone").value : "").trim();
  const note = (document.getElementById("custNote") ? document.getElementById("custNote").value : "").trim();

  if (!name) {
    showToast("กรุณากรอกชื่อ-นามสกุลครับ", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสั่งซื้อ';
    return;
  }

  if (!phone || phone.length < 9) {
    showToast("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9-10 หลัก)", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสั่งซื้อ';
    return;
  }

  const orderItems = (activeCheckoutItems && activeCheckoutItems.length > 0) ? activeCheckoutItems : cart;
  const totalPrice = orderItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

  let orderData = {
    action: "createOrder",
    buyer_type: isTeacher ? "คุณครู" : "นักเรียน",
    items: orderItems,
    total_price: totalPrice,
    student_name: name,
    phone: phone,
    note: note,
    customer_email: (getCurrentCustomer() && getCurrentCustomer().email) || "-"
  };

  if (isTeacher) {
    const tDept = (document.getElementById("teacherDept") ? document.getElementById("teacherDept").value : "กลุ่มสาระการเรียนรู้การงานอาชีพ");
    const tLocSelect = (document.getElementById("teacherLocationSelect") ? document.getElementById("teacherLocationSelect").value : "ห้องพักครูกลุ่มสาระการงานอาชีพ");
    const tBuilding = (document.getElementById("teacherBuildingSelect") ? document.getElementById("teacherBuildingSelect").value : "").trim();
    const tBuildingDetail = (document.getElementById("teacherBuildingDetail") ? document.getElementById("teacherBuildingDetail").value : "").trim();

    let pickupLoc = tLocSelect;
    if (tBuilding) {
      pickupLoc += ` (${tBuilding}${tBuildingDetail ? ' ' + tBuildingDetail : ''})`;
    } else if (tBuildingDetail) {
      pickupLoc += ` (${tBuildingDetail})`;
    }

    orderData.department = tDept;
    orderData.student_class = "ครู: " + tDept;
    orderData.student_room = "ห้องพักครู";
    orderData.student_no = "-";
    orderData.pickup_location = pickupLoc;
  } else {
    const sRoom = (document.getElementById("custRoom") ? document.getElementById("custRoom").value : "").trim();
    const sNo = (document.getElementById("custNo") ? document.getElementById("custNo").value : "").trim();
    const sLoc = (document.getElementById("custLocationStudent") ? document.getElementById("custLocationStudent").value : "หมวดการงานอาชีพ (ห้องพักครูหมวดการงานอาชีพ)");

    if (!sRoom) {
      showToast("กรุณากรอกเลขห้องของนักเรียนครับ", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสั่งซื้อ';
      return;
    }

    orderData.department = "-";
    orderData.student_class = "นักเรียน";
    orderData.student_room = sRoom;
    orderData.student_no = sNo || "-";
    orderData.pickup_location = sLoc;
  }

  // แนบอีเมลและ Token ผู้ขายเพื่อส่งแจ้งเตือน
  orderData.admin_emails = localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || DEFAULT_ADMIN_EMAIL;
  orderData.seller_token = localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKENS") || localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKEN") || "";

  try {
    let orderId = "ORD-" + Date.now().toString().slice(-6);
    const targetGasUrl = getActiveApiUrl();

    if (targetGasUrl) {
      try {
        const response = await fetch(targetGasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(orderData)
        });
        const result = await response.json();
        if (result.success && result.order_id) {
          orderId = result.order_id;
        }
      } catch (postErr) {
        console.warn("GAS fetch POST failed (possibly file:/// or CORS), attempting fallback:", postErr);
        fetch(targetGasUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(orderData)
        }).catch(e => console.warn("no-cors order err:", e));
      }
    } else {
      // บันทึกลง LocalStorage กรณีไม่มี API
      const localOrders = JSON.parse(localStorage.getItem("SCHOOLSHOP_ORDERS") || "[]");
      const newLocalOrder = {
        order_id: orderId,
        timestamp: new Date().toLocaleString("th-TH"),
        ...orderData,
        status: "รอดำเนินการ"
      };
      localOrders.unshift(newLocalOrder);
      localStorage.setItem("SCHOOLSHOP_ORDERS", JSON.stringify(localOrders));

      // ตัดสต็อกใน Local
      orderItems.forEach(c => {
        const p = products.find(prod => String(prod.id) === String(c.id));
        if (p) p.stock = Math.max(0, (Number(p.stock) || 0) - c.quantity);
      });
      localStorage.setItem("SCHOOLSHOP_LOCAL_PRODUCTS", JSON.stringify(products));
      renderProducts();
    }

    // บันทึกคำสั่งซื้อล่าสุดของผู้ใช้ไว้ในเครื่องเพื่อให้เช็กง่ายๆ
    const myHistory = JSON.parse(localStorage.getItem("MY_ORDER_HISTORY") || "[]");
    myHistory.unshift({ orderId: orderId, date: new Date().toLocaleString("th-TH"), total: orderData.total_price });
    localStorage.setItem("MY_ORDER_HISTORY", JSON.stringify(myHistory));

    // เคลียร์ตะกร้าถ้าสั่งซื้อผ่านตะกร้าปกติ (ไม่ใช่ Buy Now แยกชิ้น)
    if (!isBuyNowFlow) {
      cart = [];
      saveCart();
      updateCartBadge();
    }
    activeCheckoutItems = null;
    isBuyNowFlow = false;
    closeCheckoutModal();

    showToast(`สั่งซื้อสำเร็จ! รหัสคำสั่งซื้อ: ${orderId}`, "success");
    const buyerDisplay = isTeacher ? `คุณครู ${orderData.student_name} (${orderData.department})` : `${orderData.student_name} (ชั้น ${orderData.student_class}/${orderData.student_room})`;
    alert(`🎉 สั่งซื้อสินค้าสำเร็จเรียบร้อยครับ!\n\nรหัสคำสั่งซื้อ: ${orderId}\nผู้สั่ง: ${buyerDisplay}\nเบอร์โทร: ${orderData.phone}\nยอดชำระเงินปลายทาง (COD): ${orderData.total_price} บาท\nสถานที่นัดรับของ: ${orderData.pickup_location}\n\nกรุณาเตรียมเงินสดให้พอดีเมื่อมารับสินค้าครับ ขอบคุณครับ`);
  } catch (error) {
    console.error("Order error:", error);
    showToast("เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง", "error");
  }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสั่งซื้อ';
  }
}

// ==================== Order Tracking ====================
function openTrackModal() {
  document.getElementById("trackModal").classList.add("active");
  const myHistory = JSON.parse(localStorage.getItem("MY_ORDER_HISTORY") || "[]");
  if (myHistory.length > 0 && !document.getElementById("trackQueryInput").value) {
    document.getElementById("trackQueryInput").value = myHistory[0].orderId;
    searchOrders();
  }
}

function closeTrackModal() {
  document.getElementById("trackModal").classList.remove("active");
}

async function searchOrders() {
  const query = document.getElementById("trackQueryInput").value.trim();
  const listEl = document.getElementById("trackResultList");
  if (!query) {
    showToast("กรุณากรอกเบอร์โทร หรือ ชื่อ หรือ รหัสคำสั่งซื้อ", "error");
    return;
  }

  listEl.innerHTML = `<p style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหา...</p>`;

  let matchedOrders = [];

  if (GAS_API_URL) {
    try {
      const res = await fetch(`${GAS_API_URL}?action=trackOrder&query=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        matchedOrders = json.data;
      }
    } catch (e) {
      console.warn("GAS Search failed:", e);
    }
  }

  // หากไม่มีจาก GAS ให้หาจาก LocalStorage
  if (matchedOrders.length === 0) {
    const localOrders = JSON.parse(localStorage.getItem("SCHOOLSHOP_ORDERS") || "[]");
    const q = query.toLowerCase();
    matchedOrders = localOrders.filter(o => 
      (o.order_id && o.order_id.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.student_name && o.student_name.toLowerCase().includes(q))
    );
  }

  if (matchedOrders.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; background: var(--bg-main); border-radius: var(--radius-md);">
        <p style="color: var(--text-muted);">ไม่พบข้อมูลคำสั่งซื้อที่ค้นหา</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = matchedOrders.map(order => {
    let badgeClass = "badge-pending";
    if (order.status === "กำลังจัดเตรียม") badgeClass = "badge-preparing";
    else if (order.status === "พร้อมรับของ") badgeClass = "badge-ready";
    else if (order.status === "สำเร็จ") badgeClass = "badge-completed";
    else if (order.status === "ยกเลิก") badgeClass = "badge-cancelled";

    return `
      <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; background: var(--bg-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--primary-dark);">${order.order_id}</strong>
          <span class="badge ${badgeClass}">${order.status || 'รอดำเนินการ'}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          <div>ผู้สั่ง: <strong>${order.student_name}</strong> (ชั้น ${order.student_class}/${order.student_room})</div>
          <div>จุดรับของ: ${order.pickup_location || 'ห้องพักครูหมวดการงานอาชีพ'}</div>
          <div>ยอดชำระ (COD): <strong style="color: var(--primary);">${Number(order.total_price).toLocaleString()} ฿</strong></div>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== Preorder & Contact Forms ====================
function openPreorderModal() {
  document.getElementById("preorderForm").reset();
  switchPreorderBuyerType("student");
  handleNotifyChannelChange();
  autoFillPreorderCustomerData();
  document.getElementById("preorderModal").classList.add("active");
}

function openPreorderForProduct(productNameEncoded) {
  const prodName = decodeURIComponent(productNameEncoded);
  document.getElementById("preorderForm").reset();
  switchPreorderBuyerType("student");
  const nameInput = document.getElementById("preProdName");
  if (nameInput) nameInput.value = prodName;
  handleNotifyChannelChange();
  autoFillPreorderCustomerData();
  document.getElementById("preorderModal").classList.add("active");
}

function closePreorderModal() {
  document.getElementById("preorderModal").classList.remove("active");
}

function handleNotifyChannelChange() {
  const channel = document.getElementById("preNotifyChannel").value;
  const label = document.getElementById("notifyAccountLabel");
  const input = document.getElementById("preNotifyAccount");

  if (!label || !input) return;

  if (channel === "LINE") {
    label.innerHTML = '<i class="fa-brands fa-line" style="color: #06c755;"></i> Line ID หรือ เบอร์ที่ผูก LINE *';
    input.placeholder = "เช่น @somchai_line หรือ 0812345678";
  } else if (channel === "Instagram") {
    label.innerHTML = '<i class="fa-brands fa-instagram" style="color: #e1306c;"></i> IG Username (ชื่อไอจี) *';
    input.placeholder = "เช่น somchai.ig หรือ @somchai";
  } else {
    label.innerHTML = '<i class="fa-solid fa-message" style="color: #0284c7;"></i> เบอร์โทรศัพท์สำหรับรับ SMS *';
    input.placeholder = "เช่น 0812345678";
  }
}

async function handlePreorderSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submitPreorderBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกการจอง...';

  const prodName = document.getElementById("preProdName").value.trim();
  const prodQty = Number(document.getElementById("preProdQty").value) || 1;
  const name = document.getElementById("preCustName").value.trim();
  const phone = document.getElementById("preCustPhone").value.trim();
  const buyerType = (document.getElementById("preBuyerType") && document.getElementById("preBuyerType").value) || "student";
  const isTeacher = buyerType === "teacher";
  const notifyChannel = document.getElementById("preNotifyChannel").value;
  const notifyAccount = document.getElementById("preNotifyAccount").value.trim();
  const note = document.getElementById("preCustNote").value.trim();

  if (!prodName) {
    showToast("กรุณาระบุชื่อสินค้าที่ต้องการสั่งจอง", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
    return;
  }

  if (!name) {
    showToast("กรุณากรอกชื่อ-นามสกุล", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
    return;
  }

  if (!phone || phone.length < 9) {
    showToast("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9-10 หลัก)", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
    return;
  }

  if (!notifyAccount) {
    showToast("กรุณากรอกข้อมูลช่องทางติดต่อแจ้งเตือน", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
    return;
  }

  let pickupLoc = "";
  let studentClass = "นักเรียน";
  let studentRoom = "";
  let studentNo = "-";
  let department = "";

  if (isTeacher) {
    department = (document.getElementById("preTeacherDept") ? document.getElementById("preTeacherDept").value : "กลุ่มสาระการเรียนรู้การงานอาชีพ");
    const tLocSelect = (document.getElementById("preTeacherLocationSelect") ? document.getElementById("preTeacherLocationSelect").value : "ห้องพักครูกลุ่มสาระการงานอาชีพ");
    const tBuilding = (document.getElementById("preTeacherBuildingSelect") ? document.getElementById("preTeacherBuildingSelect").value : "").trim();
    const tBuildingDetail = (document.getElementById("preTeacherBuildingDetail") ? document.getElementById("preTeacherBuildingDetail").value : "").trim();

    pickupLoc = tLocSelect;
    if (tBuilding) {
      pickupLoc += ` (${tBuilding}${tBuildingDetail ? ' ' + tBuildingDetail : ''})`;
    } else if (tBuildingDetail) {
      pickupLoc += ` (${tBuildingDetail})`;
    }

    studentClass = "ครู: " + department;
    studentRoom = "ห้องพักครู";
    studentNo = "-";
  } else {
    studentRoom = (document.getElementById("preCustRoom") ? document.getElementById("preCustRoom").value : "").trim();
    studentNo = (document.getElementById("preCustNo") ? document.getElementById("preCustNo").value : "").trim() || "-";
    pickupLoc = (document.getElementById("preCustLocationStudent") ? document.getElementById("preCustLocationStudent").value : "หมวดการงานอาชีพ (ห้องพักครูหมวดการงานอาชีพ)");
    department = "-";

    if (!studentRoom) {
      showToast("กรุณากรอกเลขห้องของนักเรียนครับ", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
      return;
    }
  }

  const data = {
    action: "createPreorder",
    product_name: prodName,
    quantity: prodQty,
    student_name: name,
    buyer_type: isTeacher ? "คุณครู" : "นักเรียน",
    department: department,
    student_class: studentClass,
    student_room: studentRoom,
    student_no: studentNo,
    pickup_location: pickupLoc,
    phone: phone,
    notify_channel: notifyChannel,
    notify_account: notifyAccount,
    delivery_date: "รอคุณครูกำหนดวัน",
    note: note,
    seller_token: localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKENS") || localStorage.getItem("SCHOOLSHOP_SELLER_LINE_TOKEN") || "",
    admin_emails: localStorage.getItem("SCHOOLSHOP_ADMIN_EMAILS") || DEFAULT_ADMIN_EMAIL
  };

  let preId = "PRE-" + Date.now().toString().slice(-6);
  const targetGasUrl = getActiveApiUrl();

  if (targetGasUrl) {
    try {
      const response = await fetch(targetGasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });
      const resJson = await response.json();
      if (resJson.success && resJson.preorder_id) {
        preId = resJson.preorder_id;
      }
    } catch (err) {
      console.warn("GAS Preorder error (trying no-cors fallback):", err);
      fetch(targetGasUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      }).catch(e => console.warn("no-cors preorder err:", e));
    }
  }

  // เก็บ LocalStorage
  const preorders = JSON.parse(localStorage.getItem("SCHOOLSHOP_PREORDERS") || "[]");
  preorders.unshift({
    preorder_id: preId,
    timestamp: new Date().toLocaleString("th-TH"),
    ...data,
    status: "รอดำเนินการ (รอครูกำหนดวัน)"
  });
  localStorage.setItem("SCHOOLSHOP_PREORDERS", JSON.stringify(preorders));

  closePreorderModal();
  document.getElementById("preorderForm").reset();
  showToast(`สั่งจองสำเร็จ! รหัสการจอง: ${preId}`, "success");
  
  alert(`🎉 สั่งจองสินค้าสำเร็จเรียบร้อยครับ!\n\nรหัสการจอง: ${preId}\nสินค้า: ${data.product_name} (จำนวน ${data.quantity} ชิ้น)\nผู้สั่งจอง: ${data.student_name} (เบอร์โทร: ${data.phone})\n\n⏳ ข้อตกลงการรับสินค้า: การสั่งจองสินค้าต้องรอจัดเตรียมอย่างน้อย 2 - 3 วัน หรือตามกำหนดวันที่คุณครูผู้ขายได้กำหนดไว้\n\n🔔 เมื่อสินค้าพร้อมรับ ระบบจะส่งแจ้งเตือนผ่าน ${data.notify_channel} (${data.notify_account}) หรือเบอร์โทร ${data.phone} ของท่านครับ ขอบคุณครับ`);

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรายการสั่งจอง';
}

function openContactModal() {
  document.getElementById("contactModal").classList.add("active");
}
function closeContactModal() {
  document.getElementById("contactModal").classList.remove("active");
}

async function handleContactSubmit(e) {
  e.preventDefault();
  const data = {
    action: "sendMessage",
    student_name: document.getElementById("msgName").value.trim(),
    student_room: document.getElementById("msgRoom").value.trim(),
    message: document.getElementById("msgContent").value.trim()
  };

  if (GAS_API_URL) {
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn("GAS message error:", err);
    }
  }

  // เก็บ LocalStorage
  const msgs = JSON.parse(localStorage.getItem("SCHOOLSHOP_MESSAGES") || "[]");
  msgs.unshift({ message_id: "MSG-" + Date.now().toString().slice(-6), timestamp: new Date().toLocaleString("th-TH"), ...data, status: "รอตอบกลับ" });
  localStorage.setItem("SCHOOLSHOP_MESSAGES", JSON.stringify(msgs));

  closeContactModal();
  document.getElementById("contactForm").reset();
  showToast("ส่งข้อความถึงร้านค้าเรียบร้อยแล้ว", "success");
}

// ==================== Toast Notifications ====================
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

// ==================== View Switching & Admin Authentication ====================
function showBuyerView() {
  const buyerView = document.getElementById("buyerView");
  const sellerView = document.getElementById("sellerView");
  if (buyerView) buyerView.style.display = "block";
  if (sellerView) sellerView.style.display = "none";
  closeProductDetail(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSellerView() {
  const buyerView = document.getElementById("buyerView");
  const sellerView = document.getElementById("sellerView");
  if (buyerView) buyerView.style.display = "none";
  if (sellerView) sellerView.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (typeof refreshAllData === "function") {
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

function closeAdminAuthModal() {
  const modal = document.getElementById("adminAuthModal");
  if (modal) modal.classList.remove("active");
  const input = document.getElementById("adminPasswordInput");
  if (input) input.value = "";
  const err = document.getElementById("authErrorMsg");
  if (err) err.style.display = "none";

  // ตรวจสอบ: หากไม่ได้ล็อกอินอยู่ ให้กลับสู่หน้าร้านค้าผู้ซื้อเสมอ
  if (sessionStorage.getItem("IS_SELLER_LOGGED_IN") !== "true") {
    showBuyerView();
  }
}

function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("adminPasswordInput");
  const err = document.getElementById("authErrorMsg");
  const card = document.getElementById("adminAuthCard");
  const enteredPass = input ? input.value : "";
  const correctPass = localStorage.getItem("SCHOOLSHOP_ADMIN_PASS") || "admin1234";

  if (enteredPass === correctPass) {
    // รหัสผ่านถูกต้อง -> อนุญาตให้เข้าสู่หน้าแดชบอร์ดผู้ขาย
    sessionStorage.setItem("IS_SELLER_LOGGED_IN", "true");
    if (err) err.style.display = "none";
    const modal = document.getElementById("adminAuthModal");
    if (modal) modal.classList.remove("active");
    if (input) input.value = "";
    showSellerView();
    showToast("เข้าสู่ระบบแดชบอร์ดผู้ขายสำเร็จ", "success");
  } else {
    // รหัสผ่านไม่ถูกต้อง -> "ถ้ากดเข้าหน้าแอดมินแต่กรอกรหัสไม่ได้ก้ให้เด้งมาหน้าผู้ซื้อเหมือนเดิม"
    if (err) err.style.display = "block";
    if (card) {
      card.classList.add("shake-anim");
      setTimeout(() => card.classList.remove("shake-anim"), 450);
    }
    showToast("รหัสผ่านไม่ถูกต้อง! กำลังนำท่านกลับสู่หน้าร้านค้าผู้ซื้อ...", "error");

    setTimeout(() => {
      const modal = document.getElementById("adminAuthModal");
      if (modal) modal.classList.remove("active");
      if (input) input.value = "";
      if (err) err.style.display = "none";
      showBuyerView();
    }, 1100);
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("IS_SELLER_LOGGED_IN");
  showBuyerView();
  showToast("ออกจากระบบผู้ขายเรียบร้อยแล้ว", "info");
}

// ตรวจสอบสถานะการล็อกอินเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get("view");

  if (viewParam === "seller") {
    if (sessionStorage.getItem("IS_SELLER_LOGGED_IN") === "true") {
      showSellerView();
    } else {
      openAdminAuthModal();
    }
  } else {
    if (sessionStorage.getItem("IS_SELLER_LOGGED_IN") === "true") {
      // ผู้ใช้เคยล็อกอินไว้ในเซสชันนี้
      // สามารถคงอยู่ที่หน้าร้านค้าหรือสลับได้
    }
  }
});
