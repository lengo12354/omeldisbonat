-- ============================================================
-- TABLES DE BASE (création initiale)
-- ============================================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create products table (avec colonnes stock dès le départ)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_barre TEXT,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(10, 2) DEFAULT 0,
  stock_quantity DECIMAL(10, 2) DEFAULT 0,
  reorder_level DECIMAL(10, 2) DEFAULT 5,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create orders table (avec colonnes profit dès le départ)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_data JSONB NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  cost_amount DECIMAL(10, 2) DEFAULT 0,
  profit_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - you can tighten this later)
CREATE POLICY "Enable all operations for clients" ON clients FOR ALL USING (true);
CREATE POLICY "Enable all operations for products" ON products FOR ALL USING (true);
CREATE POLICY "Enable all operations for orders" ON orders FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_reference ON clients(reference);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_code_barre ON products(code_barre);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Create policy for collections
CREATE POLICY "Enable all operations for collections" ON collections FOR ALL USING (true);

-- Create index for collections
CREATE INDEX idx_collections_name ON collections(name);


-- ============================================================
-- MIGRATION — إضافة columns جديدة على جداول موجودة
-- شغّل هاد SQL في Supabase SQL Editor إلا كانت عندك data قديمة
-- ============================================================

-- زيد columns stock على products (ما تأثرش على data القديمة)
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) DEFAULT 5;

-- تحويل columns القديمة من INTEGER ل DECIMAL (شغّل هاد SQL ف Supabase SQL Editor)
ALTER TABLE products ALTER COLUMN stock_quantity TYPE DECIMAL(10,2);
ALTER TABLE products ALTER COLUMN reorder_level TYPE DECIMAL(10,2);

-- زيد columns profit على orders (ما تأثرش على data القديمة)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(10,2) DEFAULT 0;
