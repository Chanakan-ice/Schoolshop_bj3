/**
 * ==============================================================================
 * Web App ระบบซื้อของในโรงเรียน (School Shopping Web Application)
 * Backend Script: Google Apps Script (GAS)
 * ==============================================================================
 * สคริปต์นี้ทำหน้าที่เป็น REST API ให้บริการแก่ Frontend บน Vercel
 * ใช้คู่กับ Google Sheets สำหรับจัดเก็บข้อมูลสินค้า คำสั่งซื้อ การจอง และข้อความ
 */

// ชื่อแท็บของชีตต่างๆ
const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";
const SHEET_PREORDERS = "Preorders";
const SHEET_MESSAGES = "Messages";

/**
 * ฟังก์ชันสำหรับติดตั้งและสร้างหัวตารางเริ่มต้นใน Google Sheets อัตโนมัติ
 * (ให้กด Run ฟังก์ชันนี้ 1 ครั้งหลังจากสร้างไฟล์เสร็จ)
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ตาราง Products
  let prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEET_PRODUCTS);
    prodSheet.appendRow([
      "id",
      "name",
      "category",
      "price",
      "stock",
      "description",
      "image_url",
      "is_active"
    ]);
    prodSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e0f2fe");

    // ข้อมูลสินค้าตัวอย่าง
    const sampleProducts = [
      ["P001", "สมุดกราฟ ตราโรงเรียน", "สมุด/เครื่องเขียน", 25, 50, "สมุดกราฟตัดเส้นชัดเจน ขนาด B5 เหมาะสำหรับวิชาคณิตศาสตร์", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60", "true"],
      ["P002", "ปากกาน้ำเงินเจล 0.5 mm", "สมุด/เครื่องเขียน", 15, 100, "หมึกเจลแห้งไว เขียนลื่น ไม่สะดุด", "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60", "true"],
      ["P003", "ชุดเรขาคณิต ครบเซ็ต 4 ชิ้น", "อุปกรณ์การเรียน", 45, 30, "ประกอบด้วย ไม้บรรทัด ไม้ครึ่งวงกลม ไม้ฉาก 45 และ 60 องศา", "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=500&auto=format&fit=crop&q=60", "true"],
      ["P004", "เข็มกลัดตราโรงเรียน (แบบโลหะ)", "เครื่องแต่งกาย", 50, 40, "เข็มกลัดตราโรงเรียนมาตรฐาน เคลือบเงาสวยงาม ไม่ลอกง่าย", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60", "true"],
      ["P005", "แซนด์วิชทูน่า-ไข่ดาว", "ของว่าง/เครื่องดื่ม", 30, 20, "ทำสดใหม่ทุกเช้า อิ่มอร่อยก่อนเริ่มเรียน", "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60", "true"],
      ["P006", "นมสดรสจืด ตราโรงเรียน 200ml", "ของว่าง/เครื่องดื่ม", 12, 60, "แคลเซียมสูง เย็นสดชื่น", "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=60", "true"]
    ];
    sampleProducts.forEach(row => prodSheet.appendRow(row));
  }

  // 2. ตาราง Orders
  let orderSheet = ss.getSheetByName(SHEET_ORDERS);
  if (!orderSheet) {
    orderSheet = ss.insertSheet(SHEET_ORDERS);
    orderSheet.appendRow([
      "order_id",
      "timestamp",
      "student_name",
      "student_class",
      "student_room",
      "student_no",
      "phone",
      "pickup_location",
      "items_json",
      "total_price",
      "payment_method",
      "status",
      "note"
    ]);
    orderSheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#e0f2fe");
  }

  // 3. ตาราง Preorders
  let preSheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!preSheet) {
    preSheet = ss.insertSheet(SHEET_PREORDERS);
    preSheet.appendRow([
      "preorder_id",
      "timestamp",
      "student_name",
      "student_class",
      "student_room",
      "student_no",
      "phone",
      "product_name",
      "quantity",
      "expected_date",
      "status",
      "note"
    ]);
    preSheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#e0f2fe");
  }

  // 4. ตาราง Messages
  let msgSheet = ss.getSheetByName(SHEET_MESSAGES);
  if (!msgSheet) {
    msgSheet = ss.insertSheet(SHEET_MESSAGES);
    msgSheet.appendRow([
      "message_id",
      "timestamp",
      "student_name",
      "student_room",
      "message",
      "reply",
      "status"
    ]);
    msgSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e0f2fe");
  }

  return "Database Setup Complete!";
}

/**
 * จัดการ HTTP GET Requests
 */
function doGet(e) {
  const action = (e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    switch (action) {
      case "getProducts":
        return jsonResponse(getProducts(ss));

      case "getOrders":
        return jsonResponse(getOrders(ss));

      case "getPreorders":
        return jsonResponse(getPreorders(ss));

      case "getMessages":
        return jsonResponse(getMessages(ss));

      case "trackOrder":
        const query = e.parameter.query || "";
        return jsonResponse(trackOrders(ss, query));

      default:
        return jsonResponse({ success: false, message: "Invalid action" });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * จัดการ HTTP POST Requests
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data = {};

  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    }

    const action = data.action;

    switch (action) {
      case "createOrder":
        return jsonResponse(createOrder(ss, data));

      case "updateOrderStatus":
        return jsonResponse(updateOrderStatus(ss, data.order_id, data.status));

      case "createPreorder":
        return jsonResponse(createPreorder(ss, data));

      case "updatePreorderStatus":
        return jsonResponse(updatePreorderStatus(ss, data.preorder_id, data.status));

      case "addProduct":
        return jsonResponse(addProduct(ss, data));

      case "updateProduct":
        return jsonResponse(updateProduct(ss, data));

      case "deleteProduct":
        return jsonResponse(deleteProduct(ss, data.id));

      case "sendMessage":
        return jsonResponse(createMessage(ss, data));

      case "replyMessage":
        return jsonResponse(replyMessage(ss, data.message_id, data.reply));

      default:
        return jsonResponse({ success: false, message: "Unknown POST action: " + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// --------------------------------------------------------------------------
// ฟังก์ชันจัดการข้อมูล (CRUD Functions)
// --------------------------------------------------------------------------

function getProducts(ss) {
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    if (String(item.is_active).toLowerCase() === "true" || item.is_active === true) {
      products.push(item);
    }
  }

  return { success: true, data: products };
}

function getOrders(ss) {
  const sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const orders = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    orders.push(item);
  }

  // เรียงจากใหม่สุดไปเก่าสุด
  orders.reverse();
  return { success: true, data: orders };
}

function getPreorders(ss) {
  const sheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const preorders = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    preorders.push(item);
  }

  preorders.reverse();
  return { success: true, data: preorders };
}

function getMessages(ss) {
  const sheet = ss.getSheetByName(SHEET_MESSAGES);
  if (!sheet) return { success: true, data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const messages = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    messages.push(item);
  }

  messages.reverse();
  return { success: true, data: messages };
}

function trackOrders(ss, query) {
  if (!query) return { success: false, message: "Query is required" };
  const allOrdersRes = getOrders(ss);
  if (!allOrdersRes.success) return allOrdersRes;

  const q = String(query).trim().toLowerCase();
  const matched = allOrdersRes.data.filter(order => {
    return (
      String(order.order_id).toLowerCase().includes(q) ||
      String(order.phone).includes(q) ||
      String(order.student_name).toLowerCase().includes(q)
    );
  });

  return { success: true, data: matched };
}

function createOrder(ss, orderData) {
  const sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) throw new Error("Orders sheet not found");

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const orderId = "ORD-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

  const itemsJson = typeof orderData.items === "string" ? orderData.items : JSON.stringify(orderData.items || []);

  sheet.appendRow([
    orderId,
    dateStr,
    orderData.student_name || "",
    orderData.student_class || "",
    orderData.student_room || "",
    orderData.student_no || "",
    orderData.phone || "",
    orderData.pickup_location || "หน้าร้านค้าสหกรณ์โรงเรียน",
    itemsJson,
    Number(orderData.total_price) || 0,
    "Cash on Delivery (COD)",
    "รอดำเนินการ",
    orderData.note || ""
  ]);

  // ตัดสต็อกสินค้าอัตโนมัติ
  if (orderData.items && Array.isArray(orderData.items)) {
    deductStock(ss, orderData.items);
  } else if (typeof orderData.items === "string") {
    try {
      const parsedItems = JSON.parse(orderData.items);
      deductStock(ss, parsedItems);
    } catch (e) {}
  }

  return { success: true, order_id: orderId, message: "Order placed successfully" };
}

function deductStock(ss, items) {
  const prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) return;

  const data = prodSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const idCol = 0; // Col A
  const stockCol = 4; // Col E

  items.forEach(item => {
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idCol]) === String(item.id)) {
        const currentStock = Number(data[r][stockCol]) || 0;
        const buyQty = Number(item.quantity) || 1;
        const newStock = Math.max(0, currentStock - buyQty);
        prodSheet.getRange(r + 1, stockCol + 1).setValue(newStock);
        break;
      }
    }
  });
}

function updateOrderStatus(ss, orderId, newStatus) {
  const sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) throw new Error("Orders sheet not found");

  const data = sheet.getDataRange().getValues();
  const idCol = 0;
  const statusCol = 11; // Col L (index 11)

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(orderId)) {
      sheet.getRange(r + 1, statusCol + 1).setValue(newStatus);
      return { success: true, message: "Order status updated to " + newStatus };
    }
  }

  return { success: false, message: "Order not found" };
}

function createPreorder(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!sheet) throw new Error("Preorders sheet not found");

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const preId = "PRE-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

  sheet.appendRow([
    preId,
    dateStr,
    data.student_name || "",
    data.student_class || "",
    data.student_room || "",
    data.student_no || "",
    data.phone || "",
    data.product_name || "",
    Number(data.quantity) || 1,
    data.expected_date || "",
    "รอดำเนินการ",
    data.note || ""
  ]);

  return { success: true, preorder_id: preId, message: "Preorder saved successfully" };
}

function updatePreorderStatus(ss, preorderId, newStatus) {
  const sheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!sheet) throw new Error("Preorders sheet not found");

  const data = sheet.getDataRange().getValues();
  const idCol = 0;
  const statusCol = 10; // Col K

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(preorderId)) {
      sheet.getRange(r + 1, statusCol + 1).setValue(newStatus);
      return { success: true, message: "Preorder status updated" };
    }
  }

  return { success: false, message: "Preorder not found" };
}

function addProduct(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) throw new Error("Products sheet not found");

  const prodId = data.id || ("P" + ("000" + (sheet.getLastRow())).slice(-3));
  sheet.appendRow([
    prodId,
    data.name || "สินค้าใหม่",
    data.category || "ทั่วไป",
    Number(data.price) || 0,
    Number(data.stock) || 0,
    data.description || "",
    data.image_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60",
    "true"
  ]);

  return { success: true, id: prodId, message: "Product added" };
}

function updateProduct(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) throw new Error("Products sheet not found");

  const allData = sheet.getDataRange().getValues();
  for (let r = 1; r < allData.length; r++) {
    if (String(allData[r][0]) === String(data.id)) {
      if (data.name !== undefined) sheet.getRange(r + 1, 2).setValue(data.name);
      if (data.category !== undefined) sheet.getRange(r + 1, 3).setValue(data.category);
      if (data.price !== undefined) sheet.getRange(r + 1, 4).setValue(Number(data.price));
      if (data.stock !== undefined) sheet.getRange(r + 1, 5).setValue(Number(data.stock));
      if (data.description !== undefined) sheet.getRange(r + 1, 6).setValue(data.description);
      if (data.image_url !== undefined) sheet.getRange(r + 1, 7).setValue(data.image_url);
      if (data.is_active !== undefined) sheet.getRange(r + 1, 8).setValue(String(data.is_active));
      return { success: true, message: "Product updated successfully" };
    }
  }

  return { success: false, message: "Product not found" };
}

function deleteProduct(ss, prodId) {
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) throw new Error("Products sheet not found");

  const allData = sheet.getDataRange().getValues();
  for (let r = 1; r < allData.length; r++) {
    if (String(allData[r][0]) === String(prodId)) {
      sheet.getRange(r + 1, 8).setValue("false");
      return { success: true, message: "Product deactivated successfully" };
    }
  }

  return { success: false, message: "Product not found" };
}

function createMessage(ss, data) {
  const sheet = ss.getSheetByName(SHEET_MESSAGES);
  if (!sheet) throw new Error("Messages sheet not found");

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const msgId = "MSG-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

  sheet.appendRow([
    msgId,
    dateStr,
    data.student_name || "นักเรียน",
    data.student_room || "-",
    data.message || "",
    "",
    "รอตอบกลับ"
  ]);

  return { success: true, message_id: msgId, message: "Message sent" };
}

function replyMessage(ss, msgId, replyText) {
  const sheet = ss.getSheetByName(SHEET_MESSAGES);
  if (!sheet) throw new Error("Messages sheet not found");

  const allData = sheet.getDataRange().getValues();
  for (let r = 1; r < allData.length; r++) {
    if (String(allData[r][0]) === String(msgId)) {
      sheet.getRange(r + 1, 6).setValue(replyText);
      sheet.getRange(r + 1, 7).setValue("ตอบแล้ว");
      return { success: true, message: "Reply updated" };
    }
  }

  return { success: false, message: "Message not found" };
}

/**
 * ฟังก์ชันช่วยแปลง Object เป็น JSON Response รองรับ CORS
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
