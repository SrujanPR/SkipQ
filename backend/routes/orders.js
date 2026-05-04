const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendOrderNotification, orderConfirmationEmail, orderReadyEmail } = require('../utils/mailer');

const router = express.Router();

// Place order (student, canteen-scoped)
router.post('/', authenticateToken, (req, res) => {
  const { items, time_slot_id, notes, canteen_id } = req.body;

  if (!items || !items.length || !time_slot_id || !canteen_id) {
    return res.status(400).json({ error: 'Items, time slot, and canteen are required' });
  }

  // Validate canteen belongs to user's college
  const canteen = db.prepare('SELECT * FROM canteens WHERE id = ? AND college_id = ?').get(canteen_id, req.user.college_id);
  if (!canteen) return res.status(400).json({ error: 'Invalid canteen' });

  // Validate time slot belongs to this canteen
  const slot = db.prepare('SELECT * FROM time_slots WHERE id = ? AND canteen_id = ?').get(time_slot_id, canteen_id);
  if (!slot) return res.status(400).json({ error: 'Invalid time slot' });
  if (slot.current_orders >= slot.max_orders) {
    return res.status(400).json({ error: 'Time slot is full' });
  }

  // Calculate total and validate items belong to this canteen
  let total = 0;
  const orderItems = [];
  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND canteen_id = ? AND available = 1').get(item.menu_item_id, canteen_id);
    if (!menuItem) {
      return res.status(400).json({ error: `Menu item ${item.menu_item_id} not available` });
    }
    total += menuItem.price * item.quantity;
    orderItems.push({ ...item, price: menuItem.price, name: menuItem.name });
  }

  const createOrder = db.transaction(() => {
    const order = db.prepare(
      'INSERT INTO orders (user_id, canteen_id, time_slot_id, total_amount, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, canteen_id, time_slot_id, total, notes || '');

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)'
    );

    for (const item of orderItems) {
      insertItem.run(order.lastInsertRowid, item.menu_item_id, item.quantity, item.price);
    }

    db.prepare('UPDATE time_slots SET current_orders = current_orders + 1 WHERE id = ?').run(time_slot_id);

    return order.lastInsertRowid;
  });

  const orderId = createOrder();

  sendOrderNotification(
    req.user.email,
    `SkipQ Order #${orderId} Confirmed!`,
    orderConfirmationEmail({
      orderId,
      items: orderItems,
      total,
      timeSlot: slot.slot_time,
      userName: req.user.name,
    })
  );

  const fullOrder = db.prepare(`
    SELECT o.*, ts.slot_time, ts.date, cn.name as canteen_name
    FROM orders o
    JOIN time_slots ts ON o.time_slot_id = ts.id
    JOIN canteens cn ON o.canteen_id = cn.id
    WHERE o.id = ?
  `).get(orderId);

  const fullItems = db.prepare(`
    SELECT oi.*, mi.name, mi.category
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = ?
  `).all(orderId);

  res.json({ ...fullOrder, items: fullItems });
});

// Get my orders (student)
router.get('/my', authenticateToken, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, ts.slot_time, ts.date, cn.name as canteen_name
    FROM orders o
    JOIN time_slots ts ON o.time_slot_id = ts.id
    JOIN canteens cn ON o.canteen_id = cn.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);

  for (const order of orders) {
    order.items = db.prepare(`
      SELECT oi.*, mi.name, mi.category, mi.image_url
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(order.id);
  }

  res.json(orders);
});

// Get all orders for staff's canteen
router.get('/all', authenticateToken, requireRole('staff'), (req, res) => {
  const { status, date } = req.query;
  let query = `
    SELECT o.*, ts.slot_time, ts.date, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN time_slots ts ON o.time_slot_id = ts.id
    JOIN users u ON o.user_id = u.id
    WHERE o.canteen_id = ?
  `;

  const params = [req.user.canteen_id];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  if (date) {
    query += ' AND ts.date = ?';
    params.push(date);
  }

  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);

  for (const order of orders) {
    order.items = db.prepare(`
      SELECT oi.*, mi.name, mi.category
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(order.id);
  }

  res.json(orders);
});

// Update order status (staff, must belong to their canteen)
router.patch('/:id/status', authenticateToken, requireRole('staff'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'picked_up', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const order = db.prepare(`
    SELECT o.*, u.email, u.name as user_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ? AND o.canteen_id = ?
  `).get(req.params.id, req.user.canteen_id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  if (status === 'ready') {
    sendOrderNotification(
      order.email,
      `SkipQ Order #${order.id} is Ready!`,
      orderReadyEmail(order.user_name, order.id)
    );
  }

  res.json({ message: 'Status updated', status });
});

// Get order stats (staff, scoped to their canteen)
router.get('/stats', authenticateToken, requireRole('staff'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const cid = req.user.canteen_id;

  const todayOrders = db.prepare(`
    SELECT COUNT(*) as count FROM orders o
    JOIN time_slots ts ON o.time_slot_id = ts.id
    WHERE ts.date = ? AND o.canteen_id = ?
  `).get(today, cid);

  const pendingOrders = db.prepare(`
    SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND canteen_id = ?
  `).get(cid);

  const preparingOrders = db.prepare(`
    SELECT COUNT(*) as count FROM orders WHERE status = 'preparing' AND canteen_id = ?
  `).get(cid);

  const todayRevenue = db.prepare(`
    SELECT COALESCE(SUM(o.total_amount), 0) as total FROM orders o
    JOIN time_slots ts ON o.time_slot_id = ts.id
    WHERE ts.date = ? AND o.canteen_id = ? AND o.status != 'cancelled'
  `).get(today, cid);

  res.json({
    today_orders: todayOrders.count,
    pending: pendingOrders.count,
    preparing: preparingOrders.count,
    today_revenue: todayRevenue.total,
  });
});

module.exports = router;
