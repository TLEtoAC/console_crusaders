const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get user with stats
    const userResult = await client.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.points, u.is_admin, u.created_at,
        COUNT(DISTINCT i.id) as total_items,
        COUNT(DISTINCT CASE WHEN i.is_available = true THEN i.id END) as available_items,
        COUNT(DISTINCT s.id) as total_swaps,
        COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_swaps
      FROM users u
      LEFT JOIN items i ON u.id = i.user_id
      LEFT JOIN swaps s ON (u.id = s.requester_id OR i.id = s.item_id)
      WHERE u.id = $1
      GROUP BY u.id
    `, [req.user.id]);

    client.release();

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName } = req.body;
    const client = await pool.connect();

    const result = await client.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name), 
          last_name = COALESCE($2, last_name),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, points, is_admin
    `, [firstName, lastName, req.user.id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's items
router.get('/items', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const client = await pool.connect();

    let query = `
      SELECT i.*, 
             COUNT(s.id) as swap_requests_count,
             COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_requests
      FROM items i
      LEFT JOIN swaps s ON i.id = s.item_id
      WHERE i.user_id = $1
    `;
    let params = [req.user.id];

    if (status === 'available') {
      query += ' AND i.is_available = true';
    } else if (status === 'unavailable') {
      query += ' AND i.is_available = false';
    } else if (status === 'pending') {
      query += ' AND i.is_approved = false';
    } else if (status === 'approved') {
      query += ' AND i.is_approved = true';
    }

    query += ' GROUP BY i.id ORDER BY i.created_at DESC';

    const result = await client.query(query, params);
    client.release();

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's swap history
router.get('/swaps', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const client = await pool.connect();

    let query = '';
    let params = [req.user.id];

    if (type === 'requests') {
      // Swaps where user is the requester
      query = `
        SELECT s.*, i.title, i.images, u.first_name, u.last_name
        FROM swaps s
        JOIN items i ON s.item_id = i.id
        JOIN users u ON i.user_id = u.id
        WHERE s.requester_id = $1
        ORDER BY s.created_at DESC
      `;
    } else if (type === 'received') {
      // Swaps where user owns the item
      query = `
        SELECT s.*, i.title, i.images, u.first_name, u.last_name, u.points as requester_points
        FROM swaps s
        JOIN items i ON s.item_id = i.id
        JOIN users u ON s.requester_id = u.id
        WHERE i.user_id = $1
        ORDER BY s.created_at DESC
      `;
    } else {
      // All swaps involving the user
      query = `
        SELECT s.*, i.title, i.images, 
               CASE 
                 WHEN s.requester_id = $1 THEN 'requester'
                 ELSE 'owner'
               END as user_role,
               u.first_name, u.last_name
        FROM swaps s
        JOIN items i ON s.item_id = i.id
        JOIN users u ON (CASE WHEN s.requester_id = $1 THEN i.user_id ELSE s.requester_id END) = u.id
        WHERE s.requester_id = $1 OR i.user_id = $1
        ORDER BY s.created_at DESC
      `;
    }

    const result = await client.query(query, params);
    client.release();

    res.json({ swaps: result.rows });
  } catch (error) {
    console.error('Get user swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM items WHERE user_id = $1) as total_items,
        (SELECT COUNT(*) FROM items WHERE user_id = $1 AND is_available = true) as available_items,
        (SELECT COUNT(*) FROM items WHERE user_id = $1 AND is_approved = false) as pending_items,
        (SELECT COUNT(*) FROM swaps WHERE requester_id = $1) as total_requests,
        (SELECT COUNT(*) FROM swaps WHERE requester_id = $1 AND status = 'completed') as completed_requests,
        (SELECT COUNT(*) FROM swaps s JOIN items i ON s.item_id = i.id WHERE i.user_id = $1) as received_requests,
        (SELECT COUNT(*) FROM swaps s JOIN items i ON s.item_id = i.id WHERE i.user_id = $1 AND s.status = 'completed') as completed_received
    `, [req.user.id]);

    client.release();

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user points history (simplified - could be expanded with a points_transactions table)
router.get('/points', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT points FROM users WHERE id = $1
    `, [req.user.id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      points: result.rows[0].points,
      message: 'Points balance retrieved successfully'
    });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 