const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { db, generateTimeSlots } = require('../database');

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      college_id: user.college_id,
      college_name: user.college_name,
      canteen_id: user.canteen_id || null,
      canteen_name: user.canteen_name || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function userResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    college_id: user.college_id,
    college_name: user.college_name,
    canteen_id: user.canteen_id || null,
    canteen_name: user.canteen_name || null,
  };
}

// Get all colleges (for student signup dropdown)
router.get('/colleges', (req, res) => {
  const colleges = db.prepare('SELECT id, name FROM colleges ORDER BY name').all();
  res.json(colleges);
});

// Register student (must pick an existing college)
router.post('/register', (req, res) => {
  const { name, email, password, college_id } = req.body;

  if (!name || !email || !password || !college_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const college = db.prepare('SELECT id, name FROM colleges WHERE id = ?').get(college_id);
  if (!college) {
    return res.status(400).json({ error: 'Selected college is not available' });
  }

  // Check that the college has at least one canteen
  const canteenCount = db.prepare('SELECT COUNT(*) as count FROM canteens WHERE college_id = ?').get(college_id);
  if (canteenCount.count === 0) {
    return res.status(400).json({ error: 'This college has no canteens registered yet' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)').run(
    name, email, hashedPassword, 'student', college_id
  );

  const user = { id: result.lastInsertRowid, name, email, role: 'student', college_id: college.id, college_name: college.name };
  res.json({ token: createToken(user), user: userResponse(user) });
});

// Register college admin (creates a new college)
router.post('/register-college', (req, res) => {
  const { name, email, password, college_name } = req.body;

  if (!name || !email || !password || !college_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const existingCollege = db.prepare('SELECT id FROM colleges WHERE LOWER(name) = LOWER(?)').get(college_name.trim());
  if (existingCollege) {
    return res.status(400).json({ error: 'This college is already registered. Contact the existing admin.' });
  }

  const createAdmin = db.transaction(() => {
    const col = db.prepare('INSERT INTO colleges (name) VALUES (?)').run(college_name.trim());
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userResult = db.prepare('INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)').run(
      name, email, hashedPassword, 'college_admin', col.lastInsertRowid
    );
    return { userId: userResult.lastInsertRowid, collegeId: col.lastInsertRowid };
  });

  const { userId, collegeId } = createAdmin();
  const user = { id: userId, name, email, role: 'college_admin', college_id: collegeId, college_name: college_name.trim() };
  res.json({ token: createToken(user), user: userResponse(user) });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare(`
    SELECT u.*, c.name as college_name, cn.name as canteen_name
    FROM users u
    JOIN colleges c ON u.college_id = c.id
    LEFT JOIN canteens cn ON u.canteen_id = cn.id
    WHERE u.email = ?
  `).get(email);
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  if (!user.password) {
    return res.status(400).json({ error: 'This account uses Google Sign-In. Please sign in with Google.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  res.json({ token: createToken(user), user: userResponse(user) });
});

// Google Sign-In
router.post('/google', (req, res) => {
  const { credential, college_id } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  (async () => {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { sub: googleId, email, name } = payload;

      // Check if user already exists
      let user = db.prepare(`
        SELECT u.*, c.name as college_name, cn.name as canteen_name
        FROM users u
        JOIN colleges c ON u.college_id = c.id
        LEFT JOIN canteens cn ON u.canteen_id = cn.id
        WHERE u.google_id = ? OR u.email = ?
      `).get(googleId, email);

      if (user) {
        if (!user.google_id) {
          db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, user.id);
        }
        return res.json({ token: createToken(user), user: userResponse(user), isNew: false });
      }

      // New user - need college_id
      if (!college_id) {
        const colleges = db.prepare(`
          SELECT DISTINCT c.id, c.name FROM colleges c
          JOIN canteens cn ON cn.college_id = c.id
          ORDER BY c.name
        `).all();
        return res.json({ needsCollege: true, colleges, googleName: name, googleEmail: email });
      }

      const college = db.prepare('SELECT id, name FROM colleges WHERE id = ?').get(college_id);
      if (!college) {
        return res.status(400).json({ error: 'Selected college is not available' });
      }

      const result = db.prepare(
        'INSERT INTO users (name, email, google_id, role, college_id) VALUES (?, ?, ?, ?, ?)'
      ).run(name, email, googleId, 'student', college_id);

      const newUser = { id: result.lastInsertRowid, name, email, role: 'student', college_id: college.id, college_name: college.name };
      res.json({ token: createToken(newUser), user: userResponse(newUser), isNew: true });

    } catch (err) {
      console.error('Google auth error:', err.message);
      res.status(400).json({ error: 'Invalid Google credential' });
    }
  })();
});

module.exports = router;
