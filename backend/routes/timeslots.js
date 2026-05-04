const express = require('express');
const { db, generateTimeSlots } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get available time slots for today for a specific canteen
router.get('/', authenticateToken, (req, res) => {
  const { canteenId } = req.query;

  if (!canteenId) {
    return res.status(400).json({ error: 'canteenId is required' });
  }

  // Verify canteen belongs to user's college
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    canteenId, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  const today = new Date().toISOString().split('T')[0];

  // Ensure slots exist for today
  generateTimeSlots();

  const slots = db.prepare(
    'SELECT * FROM time_slots WHERE canteen_id = ? AND date = ? AND current_orders < max_orders ORDER BY slot_time'
  ).all(canteenId, today);

  res.json(slots);
});

module.exports = router;
