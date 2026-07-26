import { Request, Response } from 'express';
import { query } from '../config/db';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', category, search, minPrice, maxPrice, brand, rating, sort = 'created_at', order = 'desc', sellerId, inStock, featured, approved = 'true' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let conditions: string[] = ['p.is_active = true'];
  const params: any[] = [];
  let paramIdx = 1;

  if (approved === 'true') conditions.push('p.is_approved = true');
  if (category) { params.push(category); conditions.push(`c.slug = $${paramIdx++}::varchar`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.brand ILIKE $${paramIdx})`);
    paramIdx++;
  }
  if (minPrice) { params.push(parseFloat(minPrice)); conditions.push(`p.price >= $${paramIdx++}`); }
  if (maxPrice) { params.push(parseFloat(maxPrice)); conditions.push(`p.price <= $${paramIdx++}`); }
  if (brand) { params.push(brand); conditions.push(`p.brand ILIKE $${paramIdx++}`); }
  if (rating) { params.push(parseFloat(rating)); conditions.push(`p.rating >= $${paramIdx++}`); }
  if (sellerId) { params.push(sellerId); conditions.push(`p.seller_id = $${paramIdx++}::uuid`); }
  if (inStock === 'true') conditions.push('p.stock_quantity > 0');
  if (featured === 'true') conditions.push('p.is_featured = true');

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts: Record<string, string> = { price: 'p.price', rating: 'p.rating', created_at: 'p.created_at', name: 'p.name', total_sold: 'p.total_sold' };
  const sortField = allowedSorts[sort] || 'p.created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await query(`SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    params.push(limitNum, offset);
    const dataResult = await query(`
      SELECT p.id, p.name, p.slug, p.short_description, p.price, p.compare_price,
        p.discount_percent, p.thumbnail_url, p.images, p.stock_quantity,
        p.rating, p.total_reviews, p.total_sold, p.brand, p.tags,
        p.is_featured, p.requires_prescription, p.currency, p.unit,
        c.name as category_name, c.slug as category_slug,
        s.business_name as seller_name, p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      ${where}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, params);

    res.json({
      success: true,
      data: {
        products: dataResult.rows,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1 },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch products from database', error: error.message });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    const result = isUuid
      ? await query(`
          SELECT p.*, c.name as category_name, c.slug as category_slug
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.id = $1::uuid AND p.is_active = true
        `, [id])
      : await query(`
          SELECT p.*, c.name as category_name, c.slug as category_slug
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.slug = $1::varchar AND p.is_active = true
        `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const product = result.rows[0];
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Database error', error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { name, description, shortDescription, categoryId, price, comparePrice, costPrice, stockQuantity, brand, tags, images, thumbnailUrl, sku, weight, dimensions, unit, minOrderQuantity, maxOrderQuantity, requiresPrescription, isPerishable, expiryDate, countryOfOrigin, attributes, variants } = req.body;
  try {
    let sellerId: string | null = null;
    if (user.role === 'seller') {
      const sellerResult = await query('SELECT id FROM sellers WHERE user_id = $1::uuid AND is_approved = true', [user.id]);
      if (!sellerResult.rows.length) { res.status(403).json({ success: false, message: 'Seller account not approved' }); return; }
      sellerId = sellerResult.rows[0].id;
    }
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now()}`;
    const result = await query(`
      INSERT INTO products (
        seller_id, category_id, name, slug, description, short_description,
        price, compare_price, cost_price, stock_quantity, brand, tags,
        images, thumbnail_url, sku, weight, dimensions, unit,
        min_order_quantity, max_order_quantity, requires_prescription,
        is_perishable, expiry_date, country_of_origin, attributes, variants,
        is_approved, approval_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *
    `, [sellerId, categoryId, name, uniqueSlug, description, shortDescription, price, comparePrice, costPrice, stockQuantity || 0, brand, tags ? JSON.stringify(tags) : null, images ? JSON.stringify(images) : '{}', thumbnailUrl, sku, weight, dimensions ? JSON.stringify(dimensions) : null, unit || 'piece', minOrderQuantity || 1, maxOrderQuantity || 100, requiresPrescription || false, isPerishable || false, expiryDate || null, countryOfOrigin || null, attributes ? JSON.stringify(attributes) : '{}', variants ? JSON.stringify(variants) : '[]', user.role === 'admin' || user.role === 'super_admin', user.role === 'admin' || user.role === 'super_admin' ? 'approved' : 'pending']);
    res.status(201).json({ success: true, message: 'Product created', data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ success: false, message: 'Failed to create product', error: error.message }); }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const allowedFields: Record<string, string> = { name: 'name', description: 'description', shortDescription: 'short_description', price: 'price', comparePrice: 'compare_price', stockQuantity: 'stock_quantity', brand: 'brand', images: 'images', thumbnailUrl: 'thumbnail_url', isActive: 'is_active', isFeatured: 'is_featured' };
    const setClauses: string[] = []; const params: any[] = []; let idx = 1;
    for (const [key, col] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) { setClauses.push(`${col} = $${idx++}`); params.push(typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key]); }
    }
    if (setClauses.length === 0) { res.status(400).json({ success: false, message: 'No valid fields to update' }); return; }
    params.push(id);
    const result = await query(`UPDATE products SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx}::uuid RETURNING *`, params);
    res.json({ success: true, message: 'Product updated', data: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Failed to update product' }); }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    await query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1::uuid', [req.params.id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete product' }); }
};

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  const { q, page = '1', limit = '20' } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ success: false, message: 'Search query required' }); return; }
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const result = await query(`
      SELECT p.id, p.name, p.slug, p.price, p.thumbnail_url, p.rating, p.total_reviews, p.stock_quantity, p.brand, c.name as category_name,
        ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', $1::varchar)) as rank
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true AND p.is_approved = true AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', $1::varchar)
      ORDER BY rank DESC, p.rating DESC LIMIT $2 OFFSET $3
    `, [q, parseInt(limit), offset]);
    res.json({ success: true, data: { products: result.rows, query: q } });
  } catch (error: any) { res.status(500).json({ success: false, message: 'Search failed', error: error.message }); }
};

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  const { categoryId, limit = '10' } = req.query as Record<string, string>;
  try {
    const result = await query(`
      SELECT p.id, p.name, p.slug, p.price, p.thumbnail_url, p.rating, p.total_reviews
      FROM products p WHERE p.is_active = true AND p.is_approved = true ${categoryId ? 'AND p.category_id = $2::uuid' : ''}
      ORDER BY p.rating DESC, p.total_sold DESC LIMIT $1
    `, categoryId ? [parseInt(limit), categoryId] : [parseInt(limit)]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) { res.status(500).json({ success: false, message: 'Failed to get recommendations', error: error.message }); }
};
