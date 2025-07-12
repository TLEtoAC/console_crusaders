const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Public stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const client = await pool.connect();
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM items) as total_items,
        (SELECT COUNT(*) FROM swaps WHERE status = 'completed') as completed_swaps
    `);
    client.release();
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 