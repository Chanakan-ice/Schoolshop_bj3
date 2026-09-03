# โครงสร้างระบบ Web App โปรแกรมซื้อของในโรงเรียน (School Shopping Web Application)

เอกสารฉบับนี้สรุปโครงสร้างสถาปัตยกรรม ไฟล์โครงการ ฐานข้อมูล และซอร์สโค้ดสำหรับนำขึ้น **GitHub** และ **Deploy ผ่าน Vercel** โดยใช้ **Google Apps Script (GAS)** ร่วมกับ **Google Sheets** เป็น Backend Database

---

## 📋 สารบัญ (Table of Contents)
1. [สถาปัตยกรรมระบบ (System Architecture)](#1-สถาปัตยกรรมระบบ-system-architecture)
2. [โครงสร้างไดเรกทอรีโครงการ (Repository Directory Structure)](#2-โครงสร้างไดเรกทอรีโครงการ-repository-directory-structure)
3. [โครงสร้างฐานข้อมูล (Google Sheets Database Schema)](#3-โครงสร้างฐานข้อมูล-google-sheets-database-schema)
4. [Backend Code: Google Apps Script (`Code.gs`)](#4-backend-code-google-apps-script-codegs)
5. [Frontend Code (Vercel Deployment)](#5-frontend-code-vercel-deployment)
   - `index.html` (หน้าสำหรับผู้ซื้อ)
   - `seller.html` (หน้าสำหรับผู้ขาย / Admin Dashboard)
   - `styles.css` (การตกแต่งโทนสีฟ้า-ขาว)
   - `app.js` (การทำงานฝั่งผู้ซื้อ)
   - `seller.js` (การทำงานฝั่งผู้ขาย)
6. [ขั้นตอนการอัปโหลดขึ้น GitHub และ Deploy บน Vercel](#6-ขั้นตอนการอัปโหลดขึ้น-github-และ-deploy-บน-vercel)

---

## 1. สถาปัตยกรรมระบบ (System Architecture)

- **Frontend**: Single Page / Multi-page Static Web App (HTML5, Custom CSS โทนสีฟ้า-ขาว, JavaScript ES6) โฮสต์บน **Vercel** ผ่าน **GitHub**
- **Backend & API**: **Google Apps Script (GAS)** ให้บริการ REST Web API (รองรับ `doGet` และ `doPost` พร้อมตัดสต็อกอัตโนมัติ)
- **Database**: **Google Sheets** เก็บข้อมูลสินค้า, สต็อก, คำสั่งซื้อ, การสั่งจอง, จุดนัดรับ และข้อความติดต่อ
- **Payment Method**: **Cash on Delivery (COD)** ชำระเงินสดปลายทางเมื่อรับสินค้า
- **Offline / Local Fallback**: มีระบบจำลองข้อมูลในตัว สามารถเปิดใช้งานได้ทันทีแม้ยังไม่ได้ผูก URL ของ GAS

```
+-------------------------------------------------------------+
|                      User Browser                           |
|  - index.html (หน้านักเรียน/ผู้ซื้อ)                           |
|  - seller.html (หน้าแอดมิน/ร้านค้า)                           |
+------------------------------+------------------------------+
                               |
                   Fetch API (JSON / CORS)
                               |
                               v
+-------------------------------------------------------------+
|                 Google Apps Script (GAS API)                |
|  - doGet: getProducts, getOrders, getPreorders, trackOrder  |
|  - doPost: createOrder, updateStatus, addProduct, etc.      |
+------------------------------+------------------------------+
                               |
                        SpreadsheetApp
                               |
                               v
+-------------------------------------------------------------+
|                   Google Sheets Database                    |
|  - [Products] [Orders] [Preorders] [Messages]               |
+-------------------------------------------------------------+
```

---

## 2. โครงสร้างไดเรกทอรีโครงการ (Repository Directory Structure)

```
schoolshop_bj3/
├── index.html        # หน้าหลักสำหรับนักเรียน/ผู้ซื้อ (สั่งซื้อ, ติดตามพัสดุ, สั่งจอง, สอบถาม)
├── seller.html       # หน้าแดชบอร์ดสำหรับผู้ขาย (จัดการสต็อก, เปลี่ยนสถานะออเดอร์, ดูยอดขาย)
├── styles.css        # ไฟล์สไตล์หลัก โทนสีฟ้า-ขาว (Modern Blue & White, Responsive)
├── app.js            # ลอจิกการทำงานฝั่งผู้ซื้อ (ระบบตะกร้า, สั่งซื้อ COD, ค้นหาสินค้า)
├── seller.js         # ลอจิกการทำงานฝั่งผู้ขาย (คำนวณ KPI, ปรับสต็อก, เปลี่ยนสถานะ)
├── Code.gs           # ซอร์สโค้ด Google Apps Script สำหรับใส่ใน Extensions > Apps Script
├── vercel.json       # ไฟล์กำหนดค่า Routing สำหรับนำขึ้นโฮสติ้งบน Vercel
└── README.md         # เอกสารคู่มือการติดตั้งและการใช้งาน
```

---

## 3. โครงสร้างฐานข้อมูล (Google Sheets Database Schema)

ฐานข้อมูล Google Sheets ประกอบด้วย 4 แท็บชีตหลัก ซึ่งสามารถสร้างอัตโนมัติได้ด้วยฟังก์ชัน `setupDatabase()` ใน `Code.gs`:

### 3.1 ชีต `Products` (รายการสินค้าและสต็อก)
| คอลัมน์ | ชื่อฟิลด์ | ชนิดข้อมูล | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| A | `id` | Text | รหัสสินค้า (เช่น P001, P002) |
| B | `name` | Text | ชื่อสินค้า |
| C | `category` | Text | หมวดหมู่ (สมุด/เครื่องเขียน, อุปกรณ์การเรียน, ของว่าง/เครื่องดื่ม, ฯลฯ) |
| D | `price` | Number | ราคาสินค้า (บาท) |
| E | `stock` | Number | จำนวนสินค้าคงเหลือในคลัง |
| F | `description` | Text | คำอธิบายรายละเอียดสินค้า |
| G | `image_url` | Text | ลิงก์รูปภาพสินค้า |
| H | `is_active` | Boolean | สถานะการเปิดขาย (`true`/`false`) |

### 3.2 ชีต `Orders` (คำสั่งซื้อสินค้า COD)
| คอลัมน์ | ชื่อฟิลด์ | คำอธิบาย |
| :--- | :--- | :--- |
| A | `order_id` | รหัสคำสั่งซื้อ (เช่น ORD-20260903-093000) |
| B | `timestamp` | วันและเวลาที่สั่งซื้อ |
| C | `student_name` | ชื่อ-นามสกุล นักเรียน |
| D | `student_class` | ระดับชั้น (ม.1 - ม.6 หรือ คุณครู) |
| E | `student_room` | ห้องเรียน |
| F | `student_no` | เลขที่ |
| G | `phone` | เบอร์โทรศัพท์ติดต่อ |
| H | `pickup_location` | จุดนัดรับสินค้า (หน้าร้านค้าสหกรณ์ / ห้องเรียน) |
| I | `items_json` | รายการสินค้าที่สั่งซื้อในรูปแบบ JSON |
| J | `total_price` | ยอดรวมเงินชำระปลายทาง (บาท) |
| K | `payment_method` | วิธีชำระเงิน (`Cash on Delivery (COD)`) |
| L | `status` | สถานะ (`รอดำเนินการ`, `กำลังจัดเตรียม`, `พร้อมรับของ`, `สำเร็จ`, `ยกเลิก`) |
| M | `note` | หมายเหตุเพิ่มเติม |

### 3.3 ชีต `Preorders` (การสั่งจองสินค้าล่วงหน้า)
- `preorder_id`, `timestamp`, `student_name`, `student_class`, `student_room`, `student_no`, `phone`, `product_name`, `quantity`, `expected_date`, `status`, `note`

### 3.4 ชีต `Messages` (ข้อความสอบถาม)
- `message_id`, `timestamp`, `student_name`, `student_room`, `message`, `reply`, `status`

---

## 4. Backend Code: Google Apps Script (`Code.gs`)

### ขั้นตอนการติดตั้งบน Google Sheets:
1. เปิด [Google Sheets](https://sheets.new) เปล่าขึ้นมา 1 ไฟล์ ตั้งชื่อเช่น `SchoolShop_Database`
2. ไปที่เมนู **ส่วนขยาย (Extensions)** > **Apps Script**
3. ลบโค้ดเดิมออกทั้งหมด แล้วคัดลอกโค้ดจากไฟล์ `Code.gs` ในโครงการนี้ไปวาง
4. เลือกฟังก์ชัน **`setupDatabase`** จากดรอปดาวน์ด้านบน แล้วกดปุ่ม **เรียกใช้ (Run)** (กดยอมรับสิทธิ์ครั้งแรก) -> ชีตจะสร้างตารางและข้อมูลสินค้าตัวอย่างให้ทันที
5. กดปุ่มสีน้ำเงิน **ทำให้ใช้งานได้ (Deploy)** > **การทำให้ใช้งานได้ใหม่ (New deployment)**
   - **เลือกประเภท (Select type)**: Web app
   - **คำอธิบาย (Description)**: `SchoolShop API v1`
   - **ดำเนินการในฐานะ (Execute as)**: `ฉัน (Me)`
   - **ผู้มีสิทธิ์เข้าถึง (Who has access)**: **`ทุกคน (Anyone)`** *(สำคัญมาก)*
6. กด **ทำให้ใช้งานได้ (Deploy)** แล้วคัดลอก **URL เว็บแอป (Web App URL)** ที่ได้ไว้

---

## 5. Frontend Code (Vercel Deployment)

- **`index.html`**: หน้าร้านค้าสหกรณ์สำหรับนักเรียน สั่งซื้อของ, ค้นหาตามหมวดหมู่, จัดการตะกร้า, กรอกข้อมูลนักเรียน, ชำระเงิน COD, ติดตามสถานะพัสดุ และสั่งจองล่วงหน้า
- **`seller.html`**: หน้า Admin Dashboard สำหรับผู้ขาย ดูสรุปยอดขาย, อัปเดตสถานะออเดอร์, เพิ่ม/แก้ไข/ลบสินค้า, ดูสต็อกเหลือน้อย และตอบคำถาม
- **`styles.css`**: ดีไซน์โทนฟ้า-ขาว (Sky Blue `#0284c7` & White) สบายตา โมเดิร์น Responsive บนมือถือ 100%
- **`app.js` & `seller.js`**: เชื่อมต่อ REST API และมีโหมด Local Storage อัตโนมัติ

---

## 6. ขั้นตอนการอัปโหลดขึ้น GitHub และ Deploy บน Vercel

### 6.1 อัปโหลดโครงการขึ้น GitHub
เปิด Terminal / PowerShell ในโฟลเดอร์โครงการนี้ แล้วรันคำสั่ง:

```bash
# 1. สร้าง Git Repository
git init

# 2. เพิ่มไฟล์ทั้งหมด
git add .

# 3. บันทึก Commit แรก
git commit -m "Initial commit: School Shopping Web Application"

# 4. เปลี่ยนชื่อ Branch หลักเป็น main
git branch -M main

# 5. เชื่อมต่อไปยัง GitHub Repository ของคุณ (สร้าง repo ใหม่บน github.com ก่อน)
git remote add origin https://github.com/<your-username>/schoolshop_bj3.git

# 6. Push ซอร์สโค้ดขึ้น GitHub
git push -u origin main
```

### 6.2 การ Deploy บน Vercel
1. ไปที่เว็บไซต์ [Vercel](https://vercel.com/) และเข้าสู่ระบบด้วยบัญชี GitHub
2. กดปุ่ม **"Add New..."** > **"Project"**
3. เลือก Repository `schoolshop_bj3` ที่เพิ่ง Push ขึ้นไป แล้วกด **"Import"**
4. ในหน้าการตั้งค่า (Configure Project):
   - **Framework Preset**: เลือก `Other` (หรือปล่อยเป็นค่าเริ่มต้น)
   - **Root Directory**: `./`
5. กดปุ่ม **"Deploy"**
6. ภายในเวลาไม่กี่วินาที Vercel จะสร้าง URL เว็บไซต์จริงให้ (เช่น `https://schoolshop-bj3.vercel.app`)

### 6.3 การเชื่อมต่อ Web App เข้ากับ Google Apps Script
1. เปิดเว็บไซต์บน Vercel แล้วเข้าไปที่หน้า `/seller.html`
2. คลิกที่แท็บ **"ตั้งค่า API (Settings)"**
3. วาง **Web App URL** ของ Google Apps Script ที่ได้จากข้อ 4 ลงในช่อง
4. กดปุ่ม **"บันทึกการตั้งค่า"** และกด **"ทดสอบการเชื่อมต่อ"**
5. ตอนนี้ระบบหน้าร้านและหน้าผู้ขายจะเชื่อมต่อกับ Google Sheets ฐานข้อมูลจริงแบบ 100%
