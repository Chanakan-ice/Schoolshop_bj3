-- ==============================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับ ร้านค้าหมวดการงานอาชีพ บน Supabase (PostgreSQL)
-- วิธีใช้: คัดลอกข้อความทั้งหมดไปวางใน Supabase -> เมนู SQL Editor -> กดปุ่ม RUN
-- ==============================================================================

-- 1. ตารางสินค้า (products)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตารางคำสั่งซื้อ (orders)
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    timestamp TEXT,
    student_name TEXT NOT NULL,
    student_class TEXT,
    student_room TEXT,
    student_no TEXT,
    phone TEXT,
    pickup_location TEXT,
    items_json TEXT,
    total_price NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'ชำระเงินปลายทาง (COD)',
    status TEXT DEFAULT 'รอดำเนินการ',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตารางสั่งจองล่วงหน้า (preorders)
CREATE TABLE IF NOT EXISTS preorders (
    preorder_id TEXT PRIMARY KEY,
    timestamp TEXT,
    student_name TEXT NOT NULL,
    student_class TEXT,
    student_room TEXT,
    student_no TEXT,
    phone TEXT,
    notify_channel TEXT,
    notify_account TEXT,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    delivery_date TEXT,
    status TEXT DEFAULT 'รอดำเนินการ',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ตารางข้อความสอบถาม (messages)
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    timestamp TEXT,
    student_name TEXT NOT NULL,
    student_room TEXT,
    message TEXT NOT NULL,
    reply TEXT,
    status TEXT DEFAULT 'รอการตอบกลับ',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. เปิดสิทธิ์การเข้าถึงข้อมูลแบบ Public (Row Level Security - RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete products" ON products FOR DELETE USING (true);

CREATE POLICY "Public all orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public all preorders" ON preorders FOR ALL USING (true);
CREATE POLICY "Public all messages" ON messages FOR ALL USING (true);

-- 6. ใส่ข้อมูลสินค้าตัวอย่างเริ่มต้น
INSERT INTO products (id, name, category, price, stock, description, image_url, is_active)
VALUES
  ('P001', 'คุกกี้เนยสด ช็อกโกแลตชิพ (ฝีมือนักเรียน)', 'งานคหกรรม/เบเกอรี่', 35, 30, 'คุกกี้หอมเนยแท้ กรอบอร่อย ผลงานนักเรียนแผนกคหกรรม อบสดใหม่ทุกวัน', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60', true),
  ('P002', 'ผักสลัดไฮโดรโปนิกส์ ปลอดสารเคมี', 'งานเกษตร/ผลผลิต', 30, 25, 'ผักสลัดกรีนโอ๊ค-เรดโอ๊ค สด กรอบ สะอาด ปลูกโดยนักเรียนชมรมเกษตรอินทรีย์', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60', true),
  ('P003', 'กระเป๋าผ้ารักษ์โลก ลายเพ้นท์แฮนด์เมด', 'งานช่าง/งานประดิษฐ์', 79, 15, 'กระเป๋าผ้าแคนวาสอย่างดี เพ้นท์ลายศิลปะประดิษฐ์ใบต่อใบ มีเอกลักษณ์ไม่ซ้ำใคร', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60', true),
  ('P004', 'น้ำอัญชันมะนาว สดชื่น (ขวด 250ml)', 'งานคหกรรม/เบเกอรี่', 15, 40, 'น้ำสมุนไพรต้มสด หวานอมเปรี้ยว สดชื่น ดับกระหาย จากแปลงสมุนไพรโรงเรียน', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', true),
  ('P005', 'ที่รองแก้วไม้สัก ฉลุลายประดิษฐ์', 'งานช่าง/งานประดิษฐ์', 45, 20, 'ผลงานจากห้องปฏิบัติการงานช่าง ขัดเรียบ เคลือบเงากันน้ำ สวยงามทนทาน', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=60', true),
  ('P006', 'ชุดอุปกรณ์ตัดเย็บเบื้องต้น (พกพา)', 'อุปกรณ์การเรียนการงาน', 55, 30, 'ประกอบด้วย กรรไกรตัดด้าย เข็ม ด้ายหลากสี สายวัด และที่เลาะ สำหรับวิชาการงาน', 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=60', true)
ON CONFLICT (id) DO NOTHING;
