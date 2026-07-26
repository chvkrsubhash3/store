import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { connectDB, query } from '../config/db';
import bcrypt from 'bcryptjs';

const seed = async () => {
  console.log('🌱 Seeding SecureMart database...');
  await connectDB();

  const categories = [
    { name: 'Pickles & Homemade Foods', slug: 'pickles-homemade', icon: '🥒', desc: 'Traditional pickles and homemade delicacies' },
    { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: '🍎', desc: 'Fresh farm produce' },
    { name: 'Fresh Meat', slug: 'fresh-meat', icon: '🥩', desc: 'Quality fresh meat cuts' },
    { name: 'Fish & Seafood', slug: 'fish-seafood', icon: '🐟', desc: 'Fresh and frozen seafood' },
    { name: 'Dairy Products', slug: 'dairy', icon: '🥛', desc: 'Milk, cheese, butter and more' },
    { name: 'Bakery', slug: 'bakery', icon: '🍞', desc: 'Fresh breads, cakes and pastries' },
    { name: 'Rice & Grains', slug: 'rice-grains', icon: '🌾', desc: 'Premium quality rice and grains' },
    { name: 'Spices', slug: 'spices', icon: '🧂', desc: 'Aromatic spices from across India' },
    { name: 'Organic Products', slug: 'organic', icon: '🍯', desc: 'Certified organic products' },
    { name: 'Plants & Gardening', slug: 'plants-gardening', icon: '🌱', desc: 'Indoor and outdoor plants' },
    { name: 'Pharmacy', slug: 'pharmacy', icon: '💊', desc: 'Medicines and health products' },
    { name: 'Healthcare', slug: 'healthcare', icon: '🩺', desc: 'Medical devices and health monitors' },
    { name: 'Electronics', slug: 'electronics', icon: '📱', desc: 'Latest electronics and gadgets' },
    { name: 'Fashion', slug: 'fashion', icon: '👕', desc: 'Clothing for all occasions' },
    { name: 'Pet Food', slug: 'pet-food', icon: '🐶', desc: 'Nutritious food for all pets' },
  ];

  console.log('📦 Inserting categories...');
  for (const cat of categories) {
    await query(`
      INSERT INTO categories (name, slug, description, icon, is_active)
      VALUES ($1, $2, $3, $4, true) ON CONFLICT (slug) DO NOTHING
    `, [cat.name, cat.slug, cat.desc, cat.icon]).catch(console.error);
  }

  console.log('👥 Creating test users...');
  const users = [
    { first: 'Super', last: 'Admin', email: 'superadmin@securemart.local', role: 'super_admin' },
    { first: 'Admin', last: 'User', email: 'admin@securemart.local', role: 'admin' },
    { first: 'SOC', last: 'Analyst', email: 'soc@securemart.local', role: 'soc_analyst' },
    { first: 'Test', last: 'Customer', email: 'customer@securemart.local', role: 'customer' },
    { first: 'John', last: 'Seller', email: 'seller@securemart.local', role: 'seller' },
    { first: 'Delivery', last: 'Partner', email: 'delivery@securemart.local', role: 'delivery' },
    { first: 'Warehouse', last: 'Staff', email: 'warehouse@securemart.local', role: 'warehouse' },
    { first: 'Pharmacy', last: 'Manager', email: 'pharmacy@securemart.local', role: 'pharmacy_manager' },
  ];

  const passwordHash = await bcrypt.hash('SecureMart@123', 12);
  const createdUsers: Record<string, string> = {};

  for (const u of users) {
    const result = await query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, is_email_verified, is_active)
      VALUES ($1,$2,$3,$4,$5,true,true) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role RETURNING id, email, role
    `, [u.first, u.last, u.email, passwordHash, u.role]).catch(console.error);
    if (result && result.rows.length) {
      createdUsers[u.role] = result.rows[0].id;
      console.log(`  ✅ ${u.role}: ${u.email} / SecureMart@123`);
    }
  }

  if (createdUsers['seller']) {
    await query(`
      INSERT INTO sellers (user_id, business_name, business_type, description, is_approved, approval_status)
      VALUES ($1, 'SecureMart Official Store', 'Individual', 'Official demonstration store', true, 'approved')
      ON CONFLICT (user_id) DO NOTHING
    `, [createdUsers['seller']]).catch(console.error);
  }

  console.log('🛍️  Inserting sample products...');
  const sellerResult = await query("SELECT id FROM sellers WHERE is_approved = true LIMIT 1");
  const sellerId = sellerResult.rows[0]?.id;

  const productCategories = await query("SELECT id, slug FROM categories LIMIT 10");
  const catMap: Record<string, string> = {};
  productCategories.rows.forEach((c: any) => { catMap[c.slug] = c.id; });

  const sampleProducts = [
    { name: 'Organic Mango Pickle (500g)', slug: 'organic-mango-pickle-500g', categorySlug: 'pickles-homemade', price: 149, stock: 200, brand: 'Grandma\'s Kitchen' },
    { name: 'Fresh Alphonso Mangoes (1kg)', slug: 'fresh-alphonso-mangoes-1kg', categorySlug: 'fruits-vegetables', price: 299, stock: 100, brand: 'Farm Fresh' },
    { name: 'Chicken Breast Boneless (500g)', slug: 'chicken-breast-boneless-500g', categorySlug: 'fresh-meat', price: 199, stock: 50, brand: 'Fresh Farms' },
    { name: 'Amul Full Cream Milk (1L)', slug: 'amul-full-cream-milk-1l', categorySlug: 'dairy', price: 68, stock: 500, brand: 'Amul' },
    { name: 'Wireless Bluetooth Headphones', slug: 'wireless-bluetooth-headphones', categorySlug: 'electronics', price: 1499, stock: 75, brand: 'TechBeat' },
    { name: 'Paracetamol 500mg Tablets (15)', slug: 'paracetamol-500mg-15-tab', categorySlug: 'pharmacy', price: 18, stock: 1000, brand: 'Crocin', requiresPrescription: false },
  ];

  for (const p of sampleProducts) {
    const catId = catMap[p.categorySlug];
    if (!catId || !sellerId) continue;
    await query(`
      INSERT INTO products (seller_id, category_id, name, slug, description, price, stock_quantity, brand,
        requires_prescription, is_active, is_approved, approval_status, thumbnail_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true,'approved',$10) ON CONFLICT (slug) DO NOTHING
    `, [sellerId, catId, p.name, p.slug, `High quality ${p.name} available at best price.`, p.price, p.stock || 100, p.brand, (p as any).requiresPrescription || false, `https://placehold.co/400x400/1a1a2e/e94560?text=${encodeURIComponent(p.name.substring(0,10))}`]).catch(console.error);
  }

  console.log('🎫 Inserting coupons...');
  if (createdUsers['admin']) {
    await query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, valid_from, valid_until, is_active, created_by)
      VALUES
        ('WELCOME10', 'Welcome discount - 10% off', 'percentage', 10, 100, NOW(), NOW() + INTERVAL '365 days', true, $1),
        ('FLAT50', 'Flat ₹50 off on orders above ₹500', 'fixed', 50, 500, NOW(), NOW() + INTERVAL '365 days', true, $1)
      ON CONFLICT (code) DO NOTHING
    `, [createdUsers['admin']]).catch(console.error);
  }

  console.log('\n✅ Database seeded successfully!');
  process.exit(0);
};

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
