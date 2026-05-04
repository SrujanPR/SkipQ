require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');
const { initializeMailer } = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize
initializeDatabase();
initializeMailer();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/canteens', require('./routes/canteens'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/timeslots', require('./routes/timeslots'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'SkipQ API' });
});

app.listen(PORT, () => {
  console.log(`SkipQ API running on http://localhost:${PORT}`);
});
