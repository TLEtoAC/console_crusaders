const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all pending items for approval
router.get('/items/pending', adminAuth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT i.*, u.first_name, u.last_name, u.email
      FROM items i
      JOIN users u ON i.user_id = u.id
      WHERE i.is_approved = false
      ORDER BY i.created_at DESC
    `);
    client.release();

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get pending items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve item
router.put('/items/:id/approve', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    const result = await client.query(`
      UPDATE items 
      SET is_approved = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      message: 'Item approved successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Approve item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject item
router.put('/items/:id/reject', adminAuth, [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const client = await pool.connect();

    // Delete the item (or you could add a rejected status field)
    const result = await client.query(`
      DELETE FROM items WHERE id = $1 RETURNING *
    `, [id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      message: 'Item rejected and removed successfully',
      reason: reason || 'No reason provided'
    });
  } catch (error) {
    console.error('Reject item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all items (admin view)
router.get('/items', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT i.*, u.first_name, u.last_name, u.email
      FROM items i
      JOIN users u ON i.user_id = u.id
    `;
    let params = [];
    let paramCount = 0;

    if (status === 'approved') {
      query += ' WHERE i.is_approved = true';
    } else if (status === 'pending') {
      query += ' WHERE i.is_approved = false';
    } else if (status === 'available') {
      query += ' WHERE i.is_available = true';
    } else if (status === 'unavailable') {
      query += ' WHERE i.is_available = false';
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
    console.error('Get admin items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.points, u.is_admin, u.created_at,
        COUNT(DISTINCT i.id) as total_items,
        COUNT(DISTINCT CASE WHEN i.is_approved = true THEN i.id END) as approved_items,
        COUNT(DISTINCT s.id) as total_swaps,
        COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_swaps
      FROM users u
      LEFT JOIN items i ON u.id = i.user_id
      LEFT JOIN swaps s ON (u.id = s.requester_id OR i.id = s.item_id)
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    client.release();

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle admin status
router.put('/users/:id/admin', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Prevent admin from removing their own admin status
    if (parseInt(id) === req.user.id) {
      client.release();
      return res.status(400).json({ message: 'You cannot modify your own admin status' });
    }

    const result = await client.query(`
      UPDATE users 
      SET is_admin = NOT is_admin, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, is_admin
    `, [id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      message: `User ${user.is_admin ? 'promoted to' : 'demoted from'} admin successfully`,
      user
    });
  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Adjust user points
router.put('/users/:id/points', adminAuth, [
  body('points').isInt({ min: 0 }),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { points, reason } = req.body;
    const client = await pool.connect();

    const result = await client.query(`
      UPDATE users 
      SET points = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, points
    `, [points, id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User points updated successfully',
      reason: reason || 'Admin adjustment',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update points error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_admin = true) as admin_users,
        (SELECT COUNT(*) FROM items) as total_items,
        (SELECT COUNT(*) FROM items WHERE is_approved = false) as pending_items,
        (SELECT COUNT(*) FROM items WHERE is_available = true) as available_items,
        (SELECT COUNT(*) FROM swaps) as total_swaps,
        (SELECT COUNT(*) FROM swaps WHERE status = 'completed') as completed_swaps,
        (SELECT COUNT(*) FROM swaps WHERE status = 'pending') as pending_swaps,
        (SELECT SUM(points) FROM users) as total_points
    `);

    // Get recent activity
    const recentItems = await client.query(`
      SELECT i.title, i.created_at, u.first_name, u.last_name
      FROM items i
      JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `);

    const recentSwaps = await client.query(`
      SELECT s.status, s.created_at, i.title, u.first_name, u.last_name
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      JOIN users u ON s.requester_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    client.release();

    res.json({
      stats: stats.rows[0],
      recentActivity: {
        items: recentItems.rows,
        swaps: recentSwaps.rows
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category statistics
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        category,
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_items,
        COUNT(CASE WHEN is_available = true THEN 1 END) as available_items
      FROM items
      GROUP BY category
      ORDER BY total_items DESC
    `);

    client.release();

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 