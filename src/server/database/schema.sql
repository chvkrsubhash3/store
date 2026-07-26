CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  failed_login_attempts INT DEFAULT 0,
  lock_until TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  last_ip VARCHAR(45),
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  tax_id VARCHAR(100),
  description TEXT,
  rating NUMERIC(3, 2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  total_products INT DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0.00,
  is_approved BOOLEAN DEFAULT FALSE,
  approval_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  compare_price NUMERIC(10, 2),
  cost_price NUMERIC(10, 2),
  discount_percent INT DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  brand VARCHAR(100),
  tags JSONB DEFAULT '[]',
  images JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  total_sold INT DEFAULT 0,
  view_count INT DEFAULT 0,
  weight NUMERIC(8, 2),
  dimensions JSONB,
  unit VARCHAR(50) DEFAULT 'piece',
  min_order_quantity INT DEFAULT 1,
  max_order_quantity INT DEFAULT 100,
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_perishable BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  country_of_origin VARCHAR(100),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  approval_status VARCHAR(50) DEFAULT 'approved',
  attributes JSONB DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(10, 2) DEFAULT 0.00,
  coupon_code VARCHAR(50),
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  items JSONB NOT NULL,
  shipping_address JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  shipping_amount NUMERIC(10, 2) DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  coupon_code VARCHAR(50),
  tracking_number VARCHAR(100),
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  refund_status VARCHAR(50) DEFAULT 'none',
  refund_amount NUMERIC(10, 2) DEFAULT 0.00,
  refund_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  gateway_response JSONB,
  refund_id VARCHAR(255),
  refunded_amount NUMERIC(10, 2) DEFAULT 0.00,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
  max_discount_amount NUMERIC(10, 2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS securemart_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip VARCHAR(45) NOT NULL,
  country VARCHAR(100) DEFAULT 'Unknown',
  city VARCHAR(100) DEFAULT 'Unknown',
  method VARCHAR(10) NOT NULL,
  url TEXT NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  response_size_bytes INT,
  user_agent TEXT,
  role VARCHAR(50) DEFAULT 'anonymous',
  api_name VARCHAR(100),
  risk_score INT DEFAULT 0,
  severity VARCHAR(20) DEFAULT 'None',
  detected_threats JSONB DEFAULT '[]',
  is_flagged BOOLEAN DEFAULT FALSE,
  is_bot BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_body TEXT
);

CREATE TABLE IF NOT EXISTS securemart_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID REFERENCES securemart_logs(id) ON DELETE CASCADE,
  rule_id VARCHAR(50) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  risk_score INT NOT NULL,
  description TEXT,
  why_flagged TEXT,
  potential_impact TEXT,
  investigation_steps JSONB DEFAULT '[]',
  mitigations JSONB DEFAULT '[]',
  owasp_category VARCHAR(100),
  ip VARCHAR(45) NOT NULL,
  country VARCHAR(100),
  user_agent TEXT,
  url TEXT,
  payload_sample TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  is_false_positive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON securemart_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_ip ON securemart_logs(ip);
CREATE INDEX IF NOT EXISTS idx_logs_flagged ON securemart_logs(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON securemart_alerts(is_resolved) WHERE is_resolved = FALSE;
