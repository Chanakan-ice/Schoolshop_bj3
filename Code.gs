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

    // ข้อมูลสินค้าตัวอย่าง (หมวดการงานอาชีพ)
    const sampleProducts = [
      ["P001", "คุกกี้เนยสด ช็อกโกแลตชิพ (ฝีมือนักเรียน)", "งานคหกรรม/เบเกอรี่", 35, 30, "คุกกี้หอมเนยแท้ กรอบอร่อย ผลงานนักเรียนแผนกคหกรรม อบสดใหม่ทุกวัน", "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60", "true"],
      ["P002", "ผักสลัดไฮโดรโปนิกส์ ปลอดสารเคมี", "งานเกษตร/ผลผลิต", 30, 25, "ผักสลัดกรีนโอ๊ค-เรดโอ๊ค สด กรอบ สะอาด ปลูกโดยนักเรียนชมรมเกษตรอินทรีย์", "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60", "true"],
      ["P003", "กระเป๋าผ้ารักษ์โลก ลายเพ้นท์แฮนด์เมด", "งานช่าง/งานประดิษฐ์", 79, 15, "กระเป๋าผ้าแคนวาสอย่างดี เพ้นท์ลายศิลปะประดิษฐ์ใบต่อใบ มีเอกลักษณ์ไม่ซ้ำใคร", "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60", "true"],
      ["P004", "น้ำอัญชันมะนาว สดชื่น (ขวด 250ml)", "งานคหกรรม/เบเกอรี่", 15, 40, "น้ำสมุนไพรต้มสด หวานอมเปรี้ยว สดชื่น ดับกระหาย จากแปลงสมุนไพรโรงเรียน", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60", "true"],
      ["P005", "ที่รองแก้วไม้สัก ฉลุลายประดิษฐ์", "งานช่าง/งานประดิษฐ์", 45, 20, "ผลงานจากห้องปฏิบัติการงานช่าง ขัดเรียบ เคลือบเงากันน้ำ สวยงามทนทาน", "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=60", "true"],
      ["P006", "ชุดอุปกรณ์ตัดเย็บเบื้องต้น (พกพา)", "อุปกรณ์การเรียนการงาน", 55, 30, "ประกอบด้วย กรรไกรตัดด้าย เข็ม ด้ายหลากสี สายวัด และที่เลาะ สำหรับวิชาการงาน", "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=60", "true"]
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
      "notify_channel",
      "notify_account",
      "product_name",
      "quantity",
      "delivery_date",
      "status",
      "note"
    ]);
    preSheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#e0f2fe");
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

      case "setPreorderDeliveryDate":
        return jsonResponse(setPreorderDeliveryDate(ss, data.preorder_id, data.delivery_date, data.status));

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

      case "testLineNotify":
        return jsonResponse(testLineNotification(data.tokens || data.seller_token));

      case "testLineMessaging":
        return jsonResponse(testLineMessagingApi(data.channel_access_token, data.user_ids));

      case "saveLineSettings":
        return jsonResponse(saveLineSettingsToProperties(data.channel_access_token, data.user_ids));

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

  const isTeacher = orderData.buyer_type === "ครู" || orderData.buyer_type === "คุณครู" || orderData.buyer_type === "teacher";
  const name = orderData.student_name || orderData.name || "";
  const className = isTeacher ? ("ครู: " + (orderData.department || "กลุ่มสาระการงานอาชีพ")) : (orderData.student_class || "");
  const room = isTeacher ? (orderData.department || "ห้องพักครู") : (orderData.student_room || "");
  const no = isTeacher ? "-" : (orderData.student_no || "");
  const note = (isTeacher ? "[ผู้สั่ง: คุณครู/บุคลากร] " : "") + (orderData.note || "");

  sheet.appendRow([
    orderId,
    dateStr,
    name,
    className,
    room,
    no,
    orderData.phone || "",
    orderData.pickup_location || (isTeacher ? "ห้องพักครู" : "ห้องพักครูหมวดการงานอาชีพ"),
    itemsJson,
    Number(orderData.total_price) || 0,
    "Cash on Delivery (COD)",
    "รอดำเนินการ",
    note
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

  // ส่งแจ้งเตือนคำสั่งซื้อใหม่ไปยัง LINE ครู/แอดมิน
  try {
    notifySellerNewOrder(orderData, orderId);
  } catch (err) {
    Logger.log("Notify order error: " + err);
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
    data.notify_channel || "SMS",
    data.notify_account || data.phone || "",
    data.product_name || "",
    Number(data.quantity) || 1,
    data.delivery_date || "รอคุณครูกำหนดวัน",
    "รอดำเนินการ (รอครูกำหนดวัน)",
    data.note || ""
  ]);

  // ส่งแจ้งเตือนไปยังผู้ขาย (LINE Notify / Webhook หากมีการตั้งค่าไว้)
  try {
    notifySellerNewPreorder(data, preId);
  } catch (err) {
    Logger.log("Notify seller error: " + err);
  }

  return { success: true, preorder_id: preId, message: "Preorder saved successfully" };
}

function setPreorderDeliveryDate(ss, preorderId, deliveryDate, status) {
  const sheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!sheet) throw new Error("Preorders sheet not found");

  const data = sheet.getDataRange().getValues();
  const idCol = 0;
  const deliveryDateCol = 11; // Col L (index 11)
  const statusCol = 12; // Col M (index 12)

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(preorderId)) {
      sheet.getRange(r + 1, deliveryDateCol + 1).setValue(deliveryDate);
      if (status) {
        sheet.getRange(r + 1, statusCol + 1).setValue(status);
      }
      return { success: true, message: "Delivery date set to " + deliveryDate };
    }
  }

  return { success: false, message: "Preorder not found" };
}

function updatePreorderStatus(ss, preorderId, newStatus) {
  const sheet = ss.getSheetByName(SHEET_PREORDERS);
  if (!sheet) throw new Error("Preorders sheet not found");

  const data = sheet.getDataRange().getValues();
  const idCol = 0;
  const statusCol = 12; // Col M

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(preorderId)) {
      sheet.getRange(r + 1, statusCol + 1).setValue(newStatus);
      return { success: true, message: "Preorder status updated" };
    }
  }

  return { success: false, message: "Preorder not found" };
}

/**
 * บันทึกการตั้งค่า LINE Messaging API ลง Script Properties ใน Google Apps Script
 */
function saveLineSettingsToProperties(token, userIds) {
  const scriptProps = PropertiesService.getScriptProperties();
  if (token) {
    scriptProps.setProperty("LINE_CHANNEL_ACCESS_TOKEN", String(token).trim());
  }
  if (userIds !== undefined) {
    scriptProps.setProperty("LINE_USER_IDS", String(userIds).trim());
  }
  return { success: true, message: "บันทึกการตั้งค่า LINE Messaging API สำเร็จแล้ว" };
}

/**
 * ฟังก์ชันหลักในการส่งข้อความผ่าน LINE Messaging API
 * รองรับทั้ง Push (1 คน), Multicast (หลายคน), และ Broadcast (ทุกคนที่เป็นเพื่อนกับบอท)
 */
function sendLineMessagingApi(messageText, customToken, customUserIds) {
  const scriptProps = PropertiesService.getScriptProperties();
  const token = customToken || scriptProps.getProperty("LINE_CHANNEL_ACCESS_TOKEN") || scriptProps.getProperty("LINE_ACCESS_TOKEN") || "";
  const rawUsers = customUserIds || scriptProps.getProperty("LINE_USER_IDS") || scriptProps.getProperty("LINE_ADMIN_USER_IDS") || scriptProps.getProperty("LINE_DESTINATION_IDS") || "";

  if (!token) {
    return { success: false, message: "ไม่พบ LINE Channel Access Token" };
  }

  const userIds = String(rawUsers).split(/[,;\n]+/).map(u => u.trim()).filter(u => u.length > 0);

  const payloadMessage = {
    type: "text",
    text: messageText
  };

  try {
    let url = "";
    let payload = {};

    if (userIds.length === 1) {
      // 1 คน: Push Message
      url = "https://api.line.me/v2/bot/message/push";
      payload = {
        to: userIds[0],
        messages: [payloadMessage]
      };
    } else if (userIds.length > 1) {
      // หลายคน: Multicast Message
      url = "https://api.line.me/v2/bot/message/multicast";
      payload = {
        to: userIds,
        messages: [payloadMessage]
      };
    } else {
      // ไม่ได้ระบุ User ID: Broadcast Message
      url = "https://api.line.me/v2/bot/message/broadcast";
      payload = {
        messages: [payloadMessage]
      };
    }

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const statusCode = res.getResponseCode();
    const responseText = res.getContentText();

    if (statusCode === 200) {
      return { success: true, message: "ส่งข้อความผ่าน LINE Messaging API สำเร็จ" };
    } else {
      Logger.log("LINE Messaging API Error (" + statusCode + "): " + responseText);
      return { success: false, statusCode: statusCode, message: responseText };
    }
  } catch (err) {
    Logger.log("sendLineMessagingApi Exception: " + err);
    return { success: false, error: err.toString() };
  }
}

/**
 * ทดสอบส่งแจ้งเตือนผ่าน LINE Messaging API
 */
function testLineMessagingApi(customToken, customUserIds) {
  const testMsg = "✅ ทดสอบการเชื่อมต่อระบบแจ้งเตือนร้านค้าหมวดการงานอาชีพผ่าน LINE Messaging API สำเร็จเรียบร้อย!";
  const result = sendLineMessagingApi(testMsg, customToken, customUserIds);
  if (result.success) {
    return { success: true, message: "ส่งข้อความทดสอบเข้า LINE ผ่าน Messaging API สำเร็จเรียบร้อยแล้ว!" };
  } else {
    return {
      success: false,
      message: "ส่งข้อความไม่สำเร็จ: " + (result.message || result.error || "กรุณาตรวจสอบ Channel Access Token และ User ID")
    };
  }
}

/**
 * แจ้งเตือนผู้ขายเมื่อมีรายการสั่งจองใหม่ (Pre-order)
 */
function notifySellerNewPreorder(data, preId) {
  const buyerInfo = (data.buyer_type === "ครู" || data.buyer_type === "คุณครู" || data.buyer_type === "teacher")
    ? `คุณครู ${data.student_name} (${data.department || data.student_class || 'หมวดการงานฯ'})`
    : `${data.student_name} (${data.student_class && data.student_class !== 'นักเรียน' ? `ชั้น ${data.student_class}/` : ''}ห้อง ${data.student_room || '-'} เลขที่ ${data.student_no || '-'})`;

  const msg = `🔔 มีรายการสั่งจองสินค้าใหม่ (หมวดการงานอาชีพ)!\nรหัส: ${preId}\nสินค้า: ${data.product_name} (${data.quantity} ชิ้น)\nผู้จอง: ${buyerInfo}\nเบอร์โทร: ${data.phone}\nจุดนัดรับ: ${data.pickup_location || '-'}\nช่องทางแจ้งเตือน: ${data.notify_channel} (${data.notify_account})\nหมายเหตุ: ${data.note || '-'}`;

  // 1. ลองส่งผ่าน LINE Messaging API
  const apiResult = sendLineMessagingApi(msg, data.line_token, data.line_user_ids);
  if (apiResult && apiResult.success) return;

  // 2. หากยังไม่ได้ตั้ง LINE Messaging API ให้ fallback ไป LINE Notify เดิม
  notifyViaLineNotify(msg, data.seller_token);
}

/**
 * แจ้งเตือนผู้ขายเมื่อมีคำสั่งซื้อใหม่ (COD Order)
 */
function notifySellerNewOrder(data, orderId) {
  const isTeacher = data.buyer_type === "ครู" || data.buyer_type === "คุณครู" || data.buyer_type === "teacher";
  const buyerInfo = isTeacher
    ? `คุณครู ${data.student_name || data.name} (${data.department || 'ไม่ระบุกลุ่มสาระ'})`
    : `${data.student_name || data.name} (${data.student_class && data.student_class !== 'นักเรียน' ? `ชั้น ${data.student_class}/` : ''}ห้อง ${data.student_room || '-'} เลขที่ ${data.student_no || '-'})`;

  const msg = `🛒 มีคำสั่งซื้อใหม่ (COD หมวดการงานอาชีพ)!\nรหัส: ${orderId}\nผู้สั่ง: ${buyerInfo}\nเบอร์โทร: ${data.phone}\nจุดนัดรับ: ${data.pickup_location || 'ห้องพักครู'}\nยอดรวม: ${data.total_price} บาท\nหมายเหตุ: ${data.note || '-'}`;

  // 1. ลองส่งผ่าน LINE Messaging API
  const apiResult = sendLineMessagingApi(msg, data.line_token, data.line_user_ids);
  if (apiResult && apiResult.success) return;

  // 2. Fallback ไปยัง LINE Notify เดิม
  notifyViaLineNotify(msg, data.seller_token);
}

/**
 * Helper ส่งผ่าน LINE Notify เดิม (เผื่อกรณีที่ยังไม่ได้ย้าย)
 */
function notifyViaLineNotify(messageText, customTokens) {
  const scriptProps = PropertiesService.getScriptProperties();
  const rawTokens = customTokens || scriptProps.getProperty("SELLER_LINE_TOKENS") || scriptProps.getProperty("SELLER_LINE_TOKEN") || "";
  if (!rawTokens) return;

  const tokens = String(rawTokens).split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
  tokens.forEach(token => {
    try {
      UrlFetchApp.fetch("https://notify-api.line.me/api/notify", {
        method: "post",
        headers: { "Authorization": "Bearer " + token },
        payload: { "message": "\n" + messageText },
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log("Notify error for token: " + err);
    }
  });
}

function testLineNotification(rawTokens) {
  // หากมี LINE Messaging API Token ให้ทดสอบผ่าน Messaging API ก่อน
  const scriptProps = PropertiesService.getScriptProperties();
  const msgToken = scriptProps.getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  if (msgToken) {
    return testLineMessagingApi(msgToken, scriptProps.getProperty("LINE_USER_IDS"));
  }

  const tokensStr = rawTokens || scriptProps.getProperty("SELLER_LINE_TOKENS") || scriptProps.getProperty("SELLER_LINE_TOKEN") || "";
  if (!tokensStr) {
    return { success: false, message: "ไม่พบการตั้งค่า LINE Token ในระบบ กรุณาระบุ Token ก่อนทดสอบ" };
  }

  const tokens = String(tokensStr).split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
  if (tokens.length === 0) {
    return { success: false, message: "ไม่มี Token ที่ถูกต้องสำหรับทดสอบ" };
  }

  let successCount = 0;
  let failCount = 0;

  tokens.forEach(token => {
    try {
      const res = UrlFetchApp.fetch("https://notify-api.line.me/api/notify", {
        method: "post",
        headers: { "Authorization": "Bearer " + token },
        payload: { "message": "\n✅ ทดสอบการเชื่อมต่อระบบแจ้งเตือนร้านค้าหมวดการงานอาชีพสำเร็จเรียบร้อย!" },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      failCount++;
    }
  });

  return {
    success: successCount > 0,
    message: `ส่งทดสอบสำเร็จ ${successCount} ท่าน (ล้มเหลว ${failCount} ท่าน)`,
    successCount: successCount,
    failCount: failCount
  };
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
