const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create swap request
router.post('/', auth, [
  body('itemId').isInt(),
  body('swapType').isIn(['direct_swap', 'points_redemption']),
  body('offeredItemId').optional().isInt(),
  body('pointsOffered').optional().isInt({ min: 0 }),
  body('message').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, swapType, offeredItemId, pointsOffered, message } = req.body;
    const client = await pool.connect();

    // Check if item exists and is available
    const itemResult = await client.query(`
      SELECT i.*, u.id as owner_id, u.points as owner_points 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = $1 AND i.is_available = true AND i.is_approved = true
    `, [itemId]);

    if (itemResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Item not found or not available' });
    }

    const item = itemResult.rows[0];

    // Check if user is trying to swap their own item
    if (item.owner_id === req.user.id) {
      client.release();
      return res.status(400).json({ message: 'You cannot swap your own item' });
    }

    // For direct_swap, check offered item
    let offeredItem = null;
    if (swapType === 'direct_swap') {
      if (!offeredItemId) {
        client.release();
        return res.status(400).json({ message: 'You must offer one of your items for a direct swap' });
      }
      // Check if offered item belongs to requester and is available
      const offeredResult = await client.query(
        'SELECT * FROM items WHERE id = $1 AND user_id = $2 AND is_available = true AND is_approved = true',
        [offeredItemId, req.user.id]
      );
      if (offeredResult.rows.length === 0) {
        client.release();
        return res.status(400).json({ message: 'Offered item not found or not available' });
      }
      offeredItem = offeredResult.rows[0];
    }

    // Check if user has enough points for points redemption
    if (swapType === 'points_redemption') {
      if (!pointsOffered || pointsOffered < item.points_value) {
        client.release();
        return res.status(400).json({ message: 'Insufficient points offered for this item' });
      }
      if (req.user.points < pointsOffered) {
        client.release();
        return res.status(400).json({ message: 'You do not have enough points' });
      }
    }

    // Check if there's already a pending swap for this item
    const existingSwap = await client.query(`
      SELECT * FROM swaps 
      WHERE item_id = $1 AND status = 'pending'
    `, [itemId]);

    if (existingSwap.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'This item already has a pending swap request' });
    }

    // Create swap request
    const swapResult = await client.query(`
      INSERT INTO swaps (requester_id, item_id, offered_item_id, swap_type, points_offered, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, itemId, offeredItemId || null, swapType, pointsOffered || 0, message]);

    client.release();

    res.status(201).json({
      message: 'Swap request created successfully',
      swap: swapResult.rows[0]
    });
  } catch (error) {
    console.error('Create swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's swap requests (as requester)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT s.*, i.title, i.images, u.first_name, u.last_name
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE s.requester_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    client.release();

    res.json({ swaps: result.rows });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get swap requests for user's items (as owner)
router.get('/my-items', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT s.*, i.title, i.images, u.first_name, u.last_name, u.points as requester_points
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      JOIN users u ON s.requester_id = u.id
      WHERE i.user_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    client.release();

    res.json({ swaps: result.rows });
  } catch (error) {
    console.error('Get my items swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept swap request
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Get swap details
    const swapResult = await client.query(`
      SELECT s.*, i.title, i.user_id as item_owner_id, i.points_value
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      WHERE s.id = $1 AND s.status = 'pending'
    `, [id]);

    if (swapResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Check if user owns the item
    if (swap.item_owner_id !== req.user.id) {
      client.release();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update swap status
    await client.query('UPDATE swaps SET status = $1 WHERE id = $2', ['accepted', id]);

    if (swap.swap_type === 'points_redemption') {
      // Deduct points from requester
      await client.query(
        'UPDATE users SET points = points - $1 WHERE id = $2',
        [swap.points_offered, swap.requester_id]
      );
      // Add points to item owner
      await client.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [swap.points_offered, req.user.id]
      );
      // Mark item as unavailable
      await client.query('UPDATE items SET is_available = false WHERE id = $1', [swap.item_id]);
    } else if (swap.swap_type === 'direct_swap') {
      // Get offered item
      const offeredItemRes = await client.query('SELECT * FROM items WHERE id = $1', [swap.offered_item_id]);
      if (offeredItemRes.rows.length === 0) {
        client.release();
        return res.status(400).json({ message: 'Offered item not found' });
      }
      const offeredItem = offeredItemRes.rows[0];
      // Transfer ownership: swap item owners
      // 1. item_id goes to requester
      await client.query('UPDATE items SET user_id = $1, is_available = false WHERE id = $2', [swap.requester_id, swap.item_id]);
      // 2. offered_item_id goes to item owner
      await client.query('UPDATE items SET user_id = $1, is_available = false WHERE id = $2', [swap.item_owner_id, swap.offered_item_id]);
    }

    client.release();

    res.json({ message: 'Swap request accepted successfully' });
  } catch (error) {
    console.error('Accept swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject swap request
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Get swap details
    const swapResult = await client.query(`
      SELECT s.*, i.user_id as item_owner_id
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      WHERE s.id = $1 AND s.status = 'pending'
    `, [id]);

    if (swapResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Check if user owns the item
    if (swap.item_owner_id !== req.user.id) {
      client.release();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update swap status
    await client.query('UPDATE swaps SET status = $1 WHERE id = $2', ['rejected', id]);

    client.release();

    res.json({ message: 'Swap request rejected successfully' });
  } catch (error) {
    console.error('Reject swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete swap
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Get swap details
    const swapResult = await client.query(`
      SELECT s.*, i.user_id as item_owner_id
      FROM swaps s
      JOIN items i ON s.item_id = i.id
      WHERE s.id = $1 AND s.status = 'accepted'
    `, [id]);

    if (swapResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Check if user is involved in the swap
    if (swap.requester_id !== req.user.id && swap.item_owner_id !== req.user.id) {
      client.release();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update swap status
    await client.query('UPDATE swaps SET status = $1 WHERE id = $2', ['completed', id]);

    client.release();

    res.json({ message: 'Swap completed successfully' });
  } catch (error) {
    console.error('Complete swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get swap statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_swaps,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_swaps,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests
      FROM swaps 
      WHERE requester_id = $1 OR item_id IN (SELECT id FROM items WHERE user_id = $1)
    `, [req.user.id]);

    client.release();

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Get swap stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 