-- ==============================================================================
-- 🏫 สคริปต์สร้างฐานข้อมูลร้านค้าโรงเรียน SchoolShop BJ3 บน Supabase (PostgreSQL)
-- หมวดการงานอาชีพ โรงเรียนเบญจมราชูทิศ ราชบุรี (BJ3)
-- ==============================================================================
-- 📋 วิธีติดตั้งฐานข้อมูลบน Supabase (ทำเพียงครั้งเดียว):
-- 1. เข้าสู่ระบบ https://supabase.com แล้วคลิกโปรเจกต์ของคุณ (หรือกด New Project)
-- 2. ที่เมนูด้านซ้าย คลิกไอคอน "SQL Editor"
-- 3. คลิกปุ่ม "+ New query" (หรือแท็บว่าง)
-- 4. คัดลอกโค้ด SQL ทั้งหมดในไฟล์นี้ไปวาง
-- 5. กดปุ่มสีเขียว "Run" (หรือกด Ctrl + Enter) เพื่อสร้างตารางทั้งหมด
-- 6. นำ "Project URL" และ "anon public key" จากเมนู Project Settings > API 
--    ไปกรอกในหน้าหลังร้าน (seller.html > แท็บตั้งค่า API) หรือใน Environment Variables บน Vercel
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ตารางสินค้า (products)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ตารางคำสั่งซื้อ (orders)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. ตารางสั่งจองสินค้าล่วงหน้า (preorders)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. ตารางข้อความสอบถาม/ติดต่อร้านค้า (messages)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. ตารางการตั้งค่าร้านค้า (store_settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. กำหนดดัชนี (Indexes) เพื่อเพิ่มความเร็วในการค้นหาและจัดเรียงข้อมูล
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preorders_status ON preorders(status);
CREATE INDEX IF NOT EXISTS idx_preorders_created ON preorders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. เปิดใช้งาน Row Level Security (RLS) และสร้างนโยบายความปลอดภัย
-- ------------------------------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- ลบนโยบายเดิมหากมี เพื่อป้องกันการซ้ำซ้อน
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Public insert products" ON products;
DROP POLICY IF EXISTS "Public update products" ON products;
DROP POLICY IF EXISTS "Public delete products" ON products;
DROP POLICY IF EXISTS "Public all orders" ON orders;
DROP POLICY IF EXISTS "Public all preorders" ON preorders;
DROP POLICY IF EXISTS "Public all messages" ON messages;
DROP POLICY IF EXISTS "Public all store_settings" ON store_settings;

-- สิทธิ์สำหรับตาราง products: ทุกคนอ่านได้, จัดการข้อมูลผ่าน API ได้
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete products" ON products FOR DELETE USING (true);

-- สิทธิ์สำหรับตาราง orders: ลูกค้าสร้างได้, แอดมินจัดการได้
CREATE POLICY "Public all orders" ON orders FOR ALL USING (true);

-- สิทธิ์สำหรับตาราง preorders: ลูกค้าสั่งจองได้, แอดมินจัดการได้
CREATE POLICY "Public all preorders" ON preorders FOR ALL USING (true);

-- สิทธิ์สำหรับตาราง messages: ลูกค้าส่งได้, แอดมินตอบกลับได้
CREATE POLICY "Public all messages" ON messages FOR ALL USING (true);

-- สิทธิ์สำหรับตาราง store_settings: อ่านและบันทึกการตั้งค่าได้
CREATE POLICY "Public all store_settings" ON store_settings FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 8. เปิดระบบ Realtime Sync เพื่ออัปเดตคำสั่งซื้อและสต็อกทันที
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'preorders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE preorders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 9. ใส่ข้อมูลสินค้าตั้งต้น (Seed Data) ผลงานนักเรียนหมวดการงานอาชีพ
-- ------------------------------------------------------------------------------
INSERT INTO products (id, name, category, price, stock, description, image_url, is_active)
VALUES
  ('P001', 'คุกกี้เนยสด ช็อกโกแลตชิพ (ฝีมือนักเรียน)', 'งานคหกรรม/เบเกอรี่', 35, 30, 'คุกกี้หอมเนยแท้ กรอบอร่อย ผลงานนักเรียนแผนกคหกรรม อบสดใหม่ทุกวัน', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60', true),
  ('P002', 'ผักสลัดไฮโดรโปนิกส์ ปลอดสารเคมี', 'งานเกษตร/ผลผลิต', 30, 25, 'ผักสลัดกรีนโอ๊ค-เรดโอ๊ค สด กรอบ สะอาด ปลูกโดยนักเรียนชมรมเกษตรอินทรีย์', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60', true),
  ('P003', 'กระเป๋าผ้ารักษ์โลก ลายเพ้นท์แฮนด์เมด', 'งานช่าง/งานประดิษฐ์', 79, 15, 'กระเป๋าผ้าแคนวาสอย่างดี เพ้นท์ลายศิลปะประดิษฐ์ใบต่อใบ มีเอกลักษณ์ไม่ซ้ำใคร', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60', true),
  ('P004', 'น้ำอัญชันมะนาว สดชื่น (ขวด 250ml)', 'งานคหกรรม/เบเกอรี่', 15, 40, 'น้ำสมุนไพรต้มสด หวานอมเปรี้ยว สดชื่น ดับกระหาย จากแปลงสมุนไพรโรงเรียน', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', true),
  ('P005', 'ที่รองแก้วไม้สัก ฉลุลายประดิษฐ์', 'งานช่าง/งานประดิษฐ์', 45, 20, 'ผลงานจากห้องปฏิบัติการงานช่าง ขัดเรียบ เคลือบเงากันน้ำ สวยงามทนทาน', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=60', true),
  ('P006', 'ชุดอุปกรณ์ตัดเย็บเบื้องต้น (พกพา)', 'อุปกรณ์การเรียนการงาน', 55, 30, 'ประกอบด้วย กรรไกรตัดด้าย เข็ม ด้ายหลากสี สายวัด และที่เลาะ สำหรับวิชาการงาน', 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=60', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- ------------------------------------------------------------------------------
-- 10. ใส่ข้อมูลการตั้งค่าเริ่มต้น (Store Settings)
-- ------------------------------------------------------------------------------
INSERT INTO store_settings (key, value)
VALUES
  ('admin_emails', 'schoolshop.bj3@gmail.com'),
  ('shop_name', 'ร้านค้าหมวดการงานอาชีพ โรงเรียนเบญจมราชูทิศ ราชบุรี'),
  ('shop_status', 'open')
ON CONFLICT (key) DO NOTHING;
