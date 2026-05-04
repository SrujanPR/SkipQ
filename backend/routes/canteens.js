const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { db, generateTimeSlots } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all canteens for the logged-in user's college (student view)
router.get('/', authenticateToken, (req, res) => {
  const canteens = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM menu_items mi WHERE mi.canteen_id = c.id AND mi.available = 1) as menu_count
    FROM canteens c
    WHERE c.college_id = ?
    ORDER BY c.name
  `).all(req.user.college_id);

  const mapped = canteens.map(c => ({
    ...c,
    image_url: c.image_data ? `/api/canteens/image/${c.id}` : null,
    image_data: undefined,
  }));

  res.json(mapped);
});

// Serve canteen image from DB
router.get('/image/:id', (req, res) => {
  const canteen = db.prepare('SELECT image_data FROM canteens WHERE id = ?').get(req.params.id);
  if (!canteen || !canteen.image_data) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const matches = canteen.image_data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'Invalid image data' });

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  res.set('Content-Type', mimeType);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
});

// Get canteens managed by the college admin (with staff counts)
router.get('/admin', authenticateToken, requireRole('college_admin'), (req, res) => {
  const canteens = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.canteen_id = c.id AND u.role = 'staff') as staff_count,
      (SELECT COUNT(*) FROM menu_items mi WHERE mi.canteen_id = c.id) as menu_count
    FROM canteens c
    WHERE c.college_id = ?
    ORDER BY c.name
  `).all(req.user.college_id);

  const mapped = canteens.map(c => ({
    ...c,
    image_url: c.image_data ? `/api/canteens/image/${c.id}` : null,
    image_data: undefined,
  }));

  res.json(mapped);
});

// Create a new canteen (college admin only)
router.post('/', authenticateToken, requireRole('college_admin'), upload.single('image'), (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Canteen name is required' });
  }

  const existing = db.prepare('SELECT id FROM canteens WHERE college_id = ? AND LOWER(name) = LOWER(?)').get(
    req.user.college_id, name.trim()
  );
  if (existing) {
    return res.status(400).json({ error: 'A canteen with this name already exists' });
  }

  let imageData = null;
  if (req.file) {
    imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  const result = db.prepare(
    'INSERT INTO canteens (college_id, name, description, image_data) VALUES (?, ?, ?, ?)'
  ).run(req.user.college_id, name.trim(), description || '', imageData);

  // Generate time slots for the new canteen
  generateTimeSlots();

  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    ...canteen,
    image_url: canteen.image_data ? `/api/canteens/image/${canteen.id}` : null,
    image_data: undefined,
    staff_count: 0,
    menu_count: 0,
  });
});

// Update canteen (college admin only)
router.put('/:id', authenticateToken, requireRole('college_admin'), upload.single('image'), (req, res) => {
  const { name, description } = req.body;

  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.id, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  let imageData = canteen.image_data;
  if (req.file) {
    imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  db.prepare(
    'UPDATE canteens SET name = COALESCE(?, name), description = COALESCE(?, description), image_data = ? WHERE id = ?'
  ).run(name || null, description !== undefined ? description : null, imageData, req.params.id);

  const updated = db.prepare('SELECT * FROM canteens WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    image_url: updated.image_data ? `/api/canteens/image/${updated.id}` : null,
    image_data: undefined,
  });
});

// Delete canteen (college admin only)
router.delete('/:id', authenticateToken, requireRole('college_admin'), (req, res) => {
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.id, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  // Check for active orders
  const activeOrders = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE canteen_id = ? AND status IN ('pending', 'preparing')"
  ).get(req.params.id);
  if (activeOrders.count > 0) {
    return res.status(400).json({ error: 'Cannot delete canteen with active orders' });
  }

  const deleteCanteen = db.transaction(() => {
    db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE canteen_id = ?)').run(req.params.id);
    db.prepare('DELETE FROM orders WHERE canteen_id = ?').run(req.params.id);
    db.prepare('DELETE FROM menu_items WHERE canteen_id = ?').run(req.params.id);
    db.prepare('DELETE FROM time_slots WHERE canteen_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE canteen_id = ?').run(req.params.id);
    db.prepare('DELETE FROM canteens WHERE id = ?').run(req.params.id);
  });
  deleteCanteen();

  res.json({ message: 'Canteen deleted' });
});

// Create staff account for a canteen (college admin only)
router.post('/:id/staff', authenticateToken, requireRole('college_admin'), (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.id, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, college_id, canteen_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, hashedPassword, 'staff', req.user.college_id, req.params.id);

  res.json({
    id: result.lastInsertRowid,
    name,
    email,
    role: 'staff',
    canteen_id: Number(req.params.id),
    canteen_name: canteen.name,
  });
});

// Get staff for a canteen (college admin only)
router.get('/:id/staff', authenticateToken, requireRole('college_admin'), (req, res) => {
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.id, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  const staff = db.prepare(
    'SELECT id, name, email, created_at FROM users WHERE canteen_id = ? AND role = ? ORDER BY name'
  ).all(req.params.id, 'staff');

  res.json(staff);
});

// Remove staff from a canteen (college admin only)
router.delete('/:canteenId/staff/:userId', authenticateToken, requireRole('college_admin'), (req, res) => {
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.canteenId, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  const result = db.prepare('DELETE FROM users WHERE id = ? AND canteen_id = ? AND role = ?').run(
    req.params.userId, req.params.canteenId, 'staff'
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Staff member not found' });

  res.json({ message: 'Staff member removed' });
});

module.exports = router;
