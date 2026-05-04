const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'skipq.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canteens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(college_id, name),
      FOREIGN KEY (college_id) REFERENCES colleges(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      google_id TEXT UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('student', 'staff', 'college_admin')),
      college_id INTEGER NOT NULL,
      canteen_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id),
      FOREIGN KEY (canteen_id) REFERENCES canteens(id)
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canteen_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      image_data TEXT,
      available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (canteen_id) REFERENCES canteens(id)
    );

    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canteen_id INTEGER NOT NULL,
      slot_time TEXT NOT NULL,
      max_orders INTEGER DEFAULT 10,
      current_orders INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      UNIQUE(canteen_id, slot_time, date),
      FOREIGN KEY (canteen_id) REFERENCES canteens(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      canteen_id INTEGER NOT NULL,
      time_slot_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'picked_up', 'cancelled')),
      total_amount REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (canteen_id) REFERENCES canteens(id),
      FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );
  `);

  // Seed a demo college + admin + canteen if none exist
  const collegeExists = db.prepare('SELECT id FROM colleges LIMIT 1').get();
  if (!collegeExists) {
    const col = db.prepare('INSERT INTO colleges (name) VALUES (?)').run('NIT Surathkal');
    const collegeId = col.lastInsertRowid;

    // Create college admin
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)').run(
      'College Admin',
      'admin@skipq.com',
      adminPassword,
      'college_admin',
      collegeId
    );
    console.log('Demo college "NIT Surathkal" + college admin created: admin@skipq.com / admin123');

    // Create a demo canteen
    const canteen = db.prepare('INSERT INTO canteens (college_id, name, description) VALUES (?, ?, ?)').run(
      collegeId,
      'Main Canteen',
      'The main campus canteen serving fresh food daily'
    );
    const canteenId = canteen.lastInsertRowid;

    // Create canteen staff account
    const staffPassword = bcrypt.hashSync('staff123', 10);
    db.prepare('INSERT INTO users (name, email, password, role, college_id, canteen_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      'Canteen Staff',
      'staff@skipq.com',
      staffPassword,
      'staff',
      collegeId,
      canteenId
    );
    console.log('Demo canteen "Main Canteen" + staff created: staff@skipq.com / staff123');

    // Seed menu items for demo canteen
    const items = [
      { name: 'Chicken Biryani', description: 'Fragrant basmati rice with spiced chicken', price: 120, category: 'Rice', image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
      { name: 'Paneer Butter Masala', description: 'Creamy tomato gravy with soft paneer cubes', price: 100, category: 'Main Course', image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
      { name: 'Masala Dosa', description: 'Crispy crepe with spiced potato filling', price: 60, category: 'South Indian', image_url: 'https://images.unsplash.com/photo-1668236543090-82eb5eace003?w=400' },
      { name: 'Chole Bhature', description: 'Spicy chickpea curry with fried bread', price: 80, category: 'North Indian', image_url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400' },
      { name: 'Veg Fried Rice', description: 'Stir-fried rice with fresh vegetables', price: 70, category: 'Rice', image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
      { name: 'Samosa (2 pcs)', description: 'Crispy pastry with spiced potato filling', price: 30, category: 'Snacks', image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
      { name: 'Cold Coffee', description: 'Chilled coffee with ice cream', price: 50, category: 'Beverages', image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400' },
      { name: 'Masala Chai', description: 'Traditional Indian spiced tea', price: 15, category: 'Beverages', image_url: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400' },
      { name: 'Vada Pav', description: 'Mumbai style spiced potato fritter in a bun', price: 25, category: 'Snacks', image_url: 'https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400' },
      { name: 'Aloo Paratha', description: 'Stuffed flatbread with spiced potatoes & butter', price: 50, category: 'North Indian', image_url: 'https://images.unsplash.com/photo-1604882355766-aa603ae644be?w=400' },
      { name: 'Pasta Alfredo', description: 'Creamy white sauce pasta with herbs', price: 90, category: 'Continental', image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400' },
      { name: 'French Fries', description: 'Crispy golden fries with ketchup', price: 40, category: 'Snacks', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
    ];

    const insert = db.prepare('INSERT INTO menu_items (canteen_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      insert.run(canteenId, item.name, item.description, item.price, item.category, item.image_url);
    }
    console.log('Menu items seeded for Main Canteen');
  }

  // Generate time slots for today for all canteens
  generateTimeSlots();
}

function generateTimeSlots() {
  const today = new Date().toISOString().split('T')[0];
  const canteens = db.prepare('SELECT id FROM canteens').all();

  const slots = [
    '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
    '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
    '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
    '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
    '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO time_slots (canteen_id, slot_time, date, max_orders) VALUES (?, ?, ?, ?)');

  for (const canteen of canteens) {
    for (const slot of slots) {
      insert.run(canteen.id, slot, today, 10);
    }
  }
}

module.exports = { db, initializeDatabase, generateTimeSlots };
