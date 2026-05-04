const express = require('express');
const multer = require('multer');
const { db } = require('../database');
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

// Serve image from DB
router.get('/image/:id', (req, res) => {
  const item = db.prepare('SELECT image_data FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item || !item.image_data) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const matches = item.image_data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'Invalid image data' });

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  res.set('Content-Type', mimeType);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
});

// Get available menu items for a specific canteen (student view)
router.get('/available/:canteenId', authenticateToken, (req, res) => {
  // Verify canteen belongs to the user's college
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(
    req.params.canteenId, req.user.college_id
  );
  if (!canteen) return res.status(404).json({ error: 'Canteen not found' });

  const items = db.prepare(
    'SELECT id, canteen_id, name, description, price, category, image_url, image_data, available, created_at FROM menu_items WHERE canteen_id = ? AND available = 1 ORDER BY category, name'
  ).all(req.params.canteenId);

  const mapped = items.map(item => ({
    ...item,
    image_url: item.image_data ? `/api/menu/image/${item.id}` : item.image_url,
    image_data: undefined,
  }));

  res.json(mapped);
});

// Get all menu items for staff's canteen (including hidden)
router.get('/', authenticateToken, requireRole('staff'), (req, res) => {
  if (!req.user.canteen_id) {
    return res.status(400).json({ error: 'No canteen assigned' });
  }

  const items = db.prepare(
    'SELECT id, canteen_id, name, description, price, category, image_url, image_data, available, created_at FROM menu_items WHERE canteen_id = ? ORDER BY category, name'
  ).all(req.user.canteen_id);

  const mapped = items.map(item => ({
    ...item,
    image_url: item.image_data ? `/api/menu/image/${item.id}` : item.image_url,
    has_uploaded_image: !!item.image_data,
    image_data: undefined,
  }));

  res.json(mapped);
});

// Add menu item with optional image upload (staff only)
router.post('/', authenticateToken, requireRole('staff'), upload.single('image'), (req, res) => {
  const { name, description, price, category, image_url } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  let imageData = null;
  if (req.file) {
    imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  const result = db.prepare(
    'INSERT INTO menu_items (canteen_id, name, description, price, category, image_url, image_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.canteen_id, name, description || '', parseFloat(price), category, image_url || '', imageData);

  const item = db.prepare('SELECT id, canteen_id, name, description, price, category, image_url, image_data, available, created_at FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    ...item,
    image_url: item.image_data ? `/api/menu/image/${item.id}` : item.image_url,
    has_uploaded_image: !!item.image_data,
    image_data: undefined,
  });
});

// Update menu item with optional image upload (staff only)
router.put('/:id', authenticateToken, requireRole('staff'), upload.single('image'), (req, res) => {
  const { name, description, price, category, image_url, available } = req.body;

  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ? AND canteen_id = ?').get(req.params.id, req.user.canteen_id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  let imageData = existing.image_data;
  if (req.file) {
    imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }
  if (image_url && !req.file) {
    imageData = null;
  }

  db.prepare(
    'UPDATE menu_items SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), category = COALESCE(?, category), image_url = COALESCE(?, image_url), image_data = ?, available = COALESCE(?, available) WHERE id = ?'
  ).run(
    name || null,
    description !== undefined ? description : null,
    price ? parseFloat(price) : null,
    category || null,
    image_url !== undefined ? image_url : null,
    imageData,
    available !== undefined ? parseInt(available) : null,
    req.params.id
  );

  const item = db.prepare('SELECT id, canteen_id, name, description, price, category, image_url, image_data, available, created_at FROM menu_items WHERE id = ?').get(req.params.id);
  res.json({
    ...item,
    image_url: item.image_data ? `/api/menu/image/${item.id}` : item.image_url,
    has_uploaded_image: !!item.image_data,
    image_data: undefined,
  });
});

// Delete menu item (staff only, must belong to their canteen)
router.delete('/:id', authenticateToken, requireRole('staff'), (req, res) => {
  const result = db.prepare('DELETE FROM menu_items WHERE id = ? AND canteen_id = ?').run(req.params.id, req.user.canteen_id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Item deleted' });
});

module.exports = router;
