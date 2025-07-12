const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all approved items
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT i.*, u.first_name, u.last_name 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.is_approved = true AND i.is_available = true
    `;
    let params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND i.category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR i.tags::text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const client = await pool.connect();
    const result = await client.query(query, params);
    client.release();

    res.json({
      items: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured items (latest approved items)
router.get('/featured', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT i.*, u.first_name, u.last_name 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.is_approved = true AND i.is_available = true
      ORDER BY i.created_at DESC 
      LIMIT 6
    `);
    client.release();

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get featured items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT i.*, u.first_name, u.last_name, u.email 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = $1
    `, [id]);
    
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new item
router.post('/', auth, upload.array('images', 5), [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').trim().isLength({ min: 1 }),
  body('category').trim().isLength({ min: 1 }),
  body('type').trim().isLength({ min: 1 }),
  body('condition').trim().isLength({ min: 1 }),
  body('pointsValue').isInt({ min: 10, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      type,
      size,
      condition,
      tags,
      pointsValue
    } = req.body;

    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO items (user_id, title, description, category, type, size, condition, tags, images, points_value, is_approved)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      req.user.id,
      title,
      description,
      category,
      type,
      size,
      condition,
      tagsArray,
      images,
      pointsValue,
      true // auto-approve
    ]);

    client.release();

    res.status(201).json({
      message: 'Item created successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's items
router.get('/user/me', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
    client.release();

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update item
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Check if item belongs to user
    const itemCheck = await client.query('SELECT * FROM items WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (itemCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Item not found or access denied' });
    }

    const {
      title,
      description,
      category,
      type,
      size,
      condition,
      tags,
      pointsValue,
      isAvailable
    } = req.body;

    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : itemCheck.rows[0].images;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : itemCheck.rows[0].tags;

    const result = await client.query(`
      UPDATE items 
      SET title = $1, description = $2, category = $3, type = $4, size = $5, 
          condition = $6, tags = $7, images = $8, points_value = $9, is_available = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND user_id = $12
      RETURNING *
    `, [
      title || itemCheck.rows[0].title,
      description || itemCheck.rows[0].description,
      category || itemCheck.rows[0].category,
      type || itemCheck.rows[0].type,
      size || itemCheck.rows[0].size,
      condition || itemCheck.rows[0].condition,
      tagsArray,
      images,
      pointsValue || itemCheck.rows[0].points_value,
      isAvailable !== undefined ? isAvailable : itemCheck.rows[0].is_available,
      id,
      req.user.id
    ]);

    client.release();

    res.json({
      message: 'Item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Check if item belongs to user
    const itemCheck = await client.query('SELECT * FROM items WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (itemCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Item not found or access denied' });
    }

    await client.query('DELETE FROM items WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    client.release();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 